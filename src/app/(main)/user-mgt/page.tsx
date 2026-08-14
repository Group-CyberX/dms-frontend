"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddUserDialog } from "@/components/user-mgt/AddUserDialog";
import { EditUserDialog } from "@/components/user-mgt/EditUserDialog";
import { getAdminUsers, getRoles, updateUserStatus, type User, type Role } from "@/lib/api-client";
import { hasPermission } from "@/lib/access-control";
import { useAuthStore } from "@/store/auth-store";
import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Filter,
	Loader,
	Plus,
	Search,
	Shield,
	ShieldCheck,
	SquarePen,
	UserCheck,
	UserMinus,
	Users,
	UsersRound,
	X,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type UserStatus = "Active" | "Inactive";

// ── Helper functions ──────────────────────────────────────────────
function toUiStatus(status: string | undefined): UserStatus {
	return status?.toUpperCase() === "INACTIVE" ? "Inactive" : "Active";
}

function getRoleName(role: User["role"] | string | null | undefined): string {
	if (!role) return "N/A";
	if (typeof role === "string") return role || "N/A";
	return role.name || "N/A";
}

function formatCreatedDate(dateValue: string | undefined): string {
	if (!dateValue) return "N/A";
	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) return "N/A";
	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// ── Sub-components ────────────────────────────────────────────────

function StatusBadge({ status }: { status: UserStatus }) {
	if (status === "Active") {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
				<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
				Active
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
			<span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
			Inactive
		</span>
	);
}

function StatCard({
	icon,
	label,
	value,
	accent,
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
	accent: string;
}) {
	return (
		<div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
			<div
				className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
				style={{ backgroundColor: `${accent}14` }}
			>
				<span style={{ color: accent }}>{icon}</span>
			</div>
			<div>
				<p className="text-[22px] font-bold leading-none text-slate-900">{value}</p>
				<p className="mt-1 text-xs text-slate-500">{label}</p>
			</div>
		</div>
	);
}

function FilterChip({
	label,
	active,
	count,
	onClick,
}: {
	label: string;
	active: boolean;
	count?: number;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
				active
					? "bg-[#953002] text-white shadow-sm"
					: "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
			}`}
		>
			{label}
			{count !== undefined && (
				<span
					className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
						active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
					}`}
				>
					{count}
				</span>
			)}
		</button>
	);
}

// ── Main Page ─────────────────────────────────────────────────────

export default function UserManagementPage() {
	// Auth state
	const role = useAuthStore((state) => state.role);
	const permissions = useAuthStore((state) => state.permissions);

	// Data state
	const [users, setUsers] = useState<User[]>([]);
	const [roles, setRoles] = useState<Role[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filter state
	const [query, setQuery] = useState("");
	const [selectedRole, setSelectedRole] = useState<string>("all");
	const [selectedStatus, setSelectedStatus] = useState<"all" | "Active" | "Inactive">("all");
	const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

	// Dialog state
	const [isAddUserOpen, setIsAddUserOpen] = useState(false);
	const [isEditUserOpen, setIsEditUserOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);

	// ── Data loading ──────────────────────────────────────────────
	const loadData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			// Fetch users first
			const usersData = await getAdminUsers();
			setUsers(usersData);

			// Try to fetch roles separately, so if the user lacks "Roles - View" permission,
			// it doesn't break the entire user management page.
			try {
				const rolesData = await getRoles();
				setRoles(rolesData);
			} catch (roleErr) {
				console.warn("Could not fetch roles for filter dropdown:", roleErr);
				setRoles([]);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load users";
			setError(message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// ── Processed rows ────────────────────────────────────────────
	const allRows = useMemo(
		() =>
			users.map((user) => ({
				id: user.userId,
				name: user.username,
				email: user.email,
				role: getRoleName(user.role),
				status: toUiStatus(user.status),
				dateCreated: formatCreatedDate(user.createdAt),
				raw: user,
			})),
		[users]
	);

	// ── Stats ─────────────────────────────────────────────────────
	const stats = useMemo(() => {
		const total = allRows.length;
		const active = allRows.filter((u) => u.status === "Active").length;
		const inactive = total - active;
		const uniqueRoles = new Set(allRows.map((u) => u.role)).size;
		return { total, active, inactive, uniqueRoles };
	}, [allRows]);

	// ── Filtering ─────────────────────────────────────────────────
	const filteredRows = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return allRows.filter((user) => {
			// Text search
			if (normalizedQuery) {
				const matchesSearch =
					user.name.toLowerCase().includes(normalizedQuery) ||
					user.email.toLowerCase().includes(normalizedQuery) ||
					user.role.toLowerCase().includes(normalizedQuery);
				if (!matchesSearch) return false;
			}

			// Role filter
			if (selectedRole !== "all" && user.role !== selectedRole) {
				return false;
			}

			// Status filter
			if (selectedStatus !== "all" && user.status !== selectedStatus) {
				return false;
			}

			return true;
		});
	}, [query, allRows, selectedRole, selectedStatus]);

	// ── Pagination ────────────────────────────────────────────────
	const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
	const safePage = Math.min(currentPage, totalPages);

	const paginatedRows = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return filteredRows.slice(start, start + pageSize);
	}, [filteredRows, safePage, pageSize]);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [query, selectedRole, selectedStatus, pageSize]);

	// ── Unique roles for filter ───────────────────────────────────
	const uniqueRoles = useMemo(() => {
		const roleSet = new Set(allRows.map((u) => u.role));
		return Array.from(roleSet).sort();
	}, [allRows]);

	// ── Handlers ──────────────────────────────────────────────────
	const handleToggleStatus = async (user: User) => {
		const nextStatus = user.status?.toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE";
		try {
			await updateUserStatus(user.userId, nextStatus);
			setUsers((current) =>
				current.map((item) =>
					item.userId === user.userId ? { ...item, status: nextStatus } : item
				)
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to update user status";
			setError(message);
		}
	};

	const handleOpenEditDialog = (user: User) => {
		setSelectedUser(user);
		setIsEditUserOpen(true);
	};

	const clearAllFilters = () => {
		setQuery("");
		setSelectedRole("all");
		setSelectedStatus("all");
	};

	const hasActiveFilters = query !== "" || selectedRole !== "all" || selectedStatus !== "all";

	const startEntry = filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
	const endEntry = Math.min(safePage * pageSize, filteredRows.length);

	// ── Render ────────────────────────────────────────────────────
	return (
		<div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#e2e2e2] px-6 py-6 md:px-8 md:py-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
				{/* Header */}
				<section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight text-[#953002]">
							User Management
						</h1>
						<p className="mt-2 text-sm text-slate-600">
							Manage user accounts, roles, and access control
						</p>
					</div>

					{hasPermission(permissions, role, "canCreateUser") && (
						<Button
							type="button"
							onClick={() => setIsAddUserOpen(true)}
							className="h-10 rounded-md bg-[#953002] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#7f2600]"
						>
							<Plus className="h-4 w-4" />
							Add User
						</Button>
					)}
				</section>

				{/* Stats Cards */}
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<StatCard
						icon={<UsersRound className="h-5 w-5" />}
						label="Total Users"
						value={stats.total}
						accent="#953002"
					/>
					<StatCard
						icon={<UserCheck className="h-5 w-5" />}
						label="Active Users"
						value={stats.active}
						accent="#059669"
					/>
					<StatCard
						icon={<UserMinus className="h-5 w-5" />}
						label="Inactive Users"
						value={stats.inactive}
						accent="#d97706"
					/>
					<StatCard
						icon={<ShieldCheck className="h-5 w-5" />}
						label="Total Roles"
						value={stats.uniqueRoles}
						accent="#6366f1"
					/>
				</div>

				{/* Filters Card */}
				<Card className="rounded-2xl border-0 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
					<CardContent className="p-4 md:p-5">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							{/* Search */}
							<div className="relative w-full max-w-sm">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Search by name, email, or role..."
									className="h-10 rounded-lg border-slate-200 bg-slate-50 pl-10 text-sm shadow-sm placeholder:text-slate-400 focus:bg-white"
								/>
								{query && (
									<button
										type="button"
										onClick={() => setQuery("")}
										className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								)}
							</div>

							{/* Filters Row */}
							<div className="flex flex-wrap items-center gap-2">
								{/* Role Dropdown */}
								<div className="relative">
									<button
										type="button"
										onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
										className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
											selectedRole !== "all"
												? "bg-[#953002] text-white shadow-sm"
												: "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
										}`}
									>
										<Filter className="h-3.5 w-3.5" />
										{selectedRole === "all" ? "All Roles" : selectedRole}
									</button>

									{isRoleDropdownOpen && (
										<>
											<div
												className="fixed inset-0 z-40"
												onClick={() => setIsRoleDropdownOpen(false)}
											/>
											<div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
												<div className="p-1.5">
													<button
														type="button"
														onClick={() => {
															setSelectedRole("all");
															setIsRoleDropdownOpen(false);
														}}
														className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
															selectedRole === "all"
																? "bg-[#953002]/5 font-medium text-[#953002]"
																: "text-slate-600 hover:bg-slate-50"
														}`}
													>
														<Users className="h-3.5 w-3.5" />
														All Roles
														<span className="ml-auto text-[10px] text-slate-400">
															{allRows.length}
														</span>
													</button>

													<div className="my-1 border-t border-slate-100" />

													{uniqueRoles.map((roleName) => {
														const count = allRows.filter(
															(u) => u.role === roleName
														).length;
														return (
															<button
																key={roleName}
																type="button"
																onClick={() => {
																	setSelectedRole(roleName);
																	setIsRoleDropdownOpen(false);
																}}
																className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
																	selectedRole === roleName
																		? "bg-[#953002]/5 font-medium text-[#953002]"
																		: "text-slate-600 hover:bg-slate-50"
																}`}
															>
																<Shield className="h-3.5 w-3.5" />
																{roleName}
																<span className="ml-auto text-[10px] text-slate-400">
																	{count}
																</span>
															</button>
														);
													})}
												</div>
											</div>
										</>
									)}
								</div>

								{/* Status Filter Chips */}
								<FilterChip
									label="All"
									active={selectedStatus === "all"}
									count={allRows.length}
									onClick={() => setSelectedStatus("all")}
								/>
								<FilterChip
									label="Active"
									active={selectedStatus === "Active"}
									count={stats.active}
									onClick={() => setSelectedStatus("Active")}
								/>
								<FilterChip
									label="Inactive"
									active={selectedStatus === "Inactive"}
									count={stats.inactive}
									onClick={() => setSelectedStatus("Inactive")}
								/>

								{/* Clear All */}
								{hasActiveFilters && (
									<button
										type="button"
										onClick={clearAllFilters}
										className="ml-1 inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-[#953002]"
									>
										<X className="h-3 w-3" />
										Clear all
									</button>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Dialogs */}
				<AddUserDialog
					open={isAddUserOpen}
					onOpenChange={setIsAddUserOpen}
					onUserCreated={loadData}
				/>
				<EditUserDialog
					open={isEditUserOpen}
					onOpenChange={(open) => {
						setIsEditUserOpen(open);
						if (!open) setSelectedUser(null);
					}}
					user={selectedUser}
					onUserUpdated={loadData}
				/>

				{/* Table Card */}
				<Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
					<CardContent className="p-0">
						{/* Table Header */}
						<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
							<div className="flex items-center gap-3">
								<h2 className="text-[15px] font-semibold text-slate-900">Users</h2>
								<Badge
									variant="outline"
									className="rounded-full border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
								>
									{filteredRows.length} of {allRows.length}
								</Badge>
							</div>

							{/* Page Size Selector */}
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<span>Show</span>
								<select
									value={pageSize}
									onChange={(e) => setPageSize(Number(e.target.value))}
									className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm focus:border-[#953002] focus:outline-none focus:ring-1 focus:ring-[#953002]/20"
								>
									{PAGE_SIZE_OPTIONS.map((size) => (
										<option key={size} value={size}>
											{size}
										</option>
									))}
								</select>
								<span>per page</span>
							</div>
						</div>

						{/* Table */}
						<div className="overflow-x-auto">
							<table className="min-w-[900px] w-full border-collapse text-left text-sm">
								<thead>
									<tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
										<th className="px-5 py-3">User</th>
										<th className="px-5 py-3">Email</th>
										<th className="px-5 py-3">Role</th>
										<th className="px-5 py-3">Status</th>
										<th className="px-5 py-3">Date Created</th>
										<th className="px-5 py-3 text-right">Actions</th>
									</tr>
								</thead>

								<tbody>
									{paginatedRows.map((user, index) => (
										<tr
											key={user.id}
											className={`border-b border-slate-50 text-slate-700 transition-colors hover:bg-[#953002]/[0.02] ${
												index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
											}`}
										>
											<td className="px-5 py-3.5">
												<div className="flex items-center gap-3">
													<div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#953002] to-[#c4500a] text-xs font-bold text-white shadow-sm">
														{user.name
															.split(" ")
															.map((n) => n[0])
															.filter(Boolean)
															.slice(0, 2)
															.join("")
															.toUpperCase() || "U"}
													</div>
													<span className="font-medium text-slate-900">
														{user.name}
													</span>
												</div>
											</td>

											<td className="px-5 py-3.5 text-slate-500">{user.email}</td>

											<td className="px-5 py-3.5">
												<Badge
													variant="outline"
													className="rounded-md border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
												>
													<Shield className="mr-1 h-3 w-3 text-slate-400" />
													{user.role}
												</Badge>
											</td>

											<td className="px-5 py-3.5">
												<StatusBadge status={user.status} />
											</td>

											<td className="px-5 py-3.5 text-slate-500">
												<div className="flex items-center gap-1.5">
													<CalendarDays className="h-3.5 w-3.5 text-slate-400" />
													<span className="text-xs">{user.dateCreated}</span>
												</div>
											</td>

											<td className="px-5 py-3.5">
												<div className="flex items-center justify-end gap-1">
													{hasPermission(permissions, role, "canEditUser") && (
														<button
															type="button"
															onClick={() => handleOpenEditDialog(user.raw)}
															className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
															aria-label={`Edit ${user.name}`}
															title="Edit user"
														>
															<SquarePen className="h-4 w-4" />
														</button>
													)}

													{hasPermission(permissions, role, "canEditUser") && (
														<button
															type="button"
															className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-100 ${
																user.status === "Active"
																	? "text-rose-400 hover:text-rose-600"
																	: "text-emerald-400 hover:text-emerald-600"
															}`}
															onClick={() => handleToggleStatus(user.raw)}
															aria-label={
																user.status === "Active"
																	? `Deactivate ${user.name}`
																	: `Activate ${user.name}`
															}
															title={
																user.status === "Active"
																	? "Deactivate user"
																	: "Activate user"
															}
														>
															{user.status === "Active" ? (
																<UserMinus className="h-4 w-4" />
															) : (
																<UserCheck className="h-4 w-4" />
															)}
														</button>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Loading State */}
						{loading && (
							<div className="px-5 py-16">
								<div className="flex flex-col items-center justify-center">
									<Loader className="h-8 w-8 animate-spin text-[#953002]" />
									<p className="mt-3 text-sm text-slate-500">Loading users...</p>
								</div>
							</div>
						)}

						{/* Error State */}
						{error && (
							<div className="border-t border-slate-100 px-5 py-6">
								<p className="text-sm text-red-600">{error}</p>
							</div>
						)}

						{/* Empty State */}
						{!loading && filteredRows.length === 0 && (
							<div className="px-5 py-16 text-center">
								<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
									<Users className="h-7 w-7 text-slate-400" />
								</div>
								<p className="mt-4 text-sm font-medium text-slate-700">
									No users found
								</p>
								<p className="mt-1 text-sm text-slate-500">
									{hasActiveFilters
										? "Try adjusting your search or filters."
										: "Get started by adding a user."}
								</p>
								{hasActiveFilters && (
									<Button
										variant="outline"
										onClick={clearAllFilters}
										className="mt-4 text-xs"
									>
										Clear all filters
									</Button>
								)}
							</div>
						)}

						{/* Pagination Footer */}
						{!loading && filteredRows.length > 0 && (
							<div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 sm:flex-row">
								{/* Entry info */}
								<p className="text-xs text-slate-500">
									Showing{" "}
									<span className="font-semibold text-slate-700">{startEntry}</span>
									{" to "}
									<span className="font-semibold text-slate-700">{endEntry}</span>
									{" of "}
									<span className="font-semibold text-slate-700">
										{filteredRows.length}
									</span>{" "}
									{filteredRows.length !== allRows.length && (
										<span className="text-slate-400">
											(filtered from {allRows.length})
										</span>
									)}
								</p>

								{/* Page controls */}
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => setCurrentPage(1)}
										disabled={safePage <= 1}
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
										aria-label="First page"
									>
										<ChevronsLeft className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
										disabled={safePage <= 1}
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
										aria-label="Previous page"
									>
										<ChevronLeft className="h-4 w-4" />
									</button>

									{/* Page numbers */}
									{Array.from({ length: totalPages }, (_, i) => i + 1)
										.filter((page) => {
											if (totalPages <= 7) return true;
											if (page === 1 || page === totalPages) return true;
											if (Math.abs(page - safePage) <= 1) return true;
											return false;
										})
										.reduce<(number | "ellipsis")[]>((acc, page, i, arr) => {
											if (i > 0 && page - (arr[i - 1] as number) > 1) {
												acc.push("ellipsis");
											}
											acc.push(page);
											return acc;
										}, [])
										.map((item, i) =>
											item === "ellipsis" ? (
												<span
													key={`ellipsis-${i}`}
													className="inline-flex h-8 w-8 items-center justify-center text-xs text-slate-400"
												>
													…
												</span>
											) : (
												<button
													key={item}
													type="button"
													onClick={() => setCurrentPage(item)}
													className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition ${
														safePage === item
															? "bg-[#953002] text-white shadow-sm"
															: "text-slate-600 hover:bg-slate-100"
													}`}
												>
													{item}
												</button>
											)
										)}

									<button
										type="button"
										onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
										disabled={safePage >= totalPages}
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
										aria-label="Next page"
									>
										<ChevronRight className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => setCurrentPage(totalPages)}
										disabled={safePage >= totalPages}
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
										aria-label="Last page"
									>
										<ChevronsRight className="h-4 w-4" />
									</button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
