"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddUserDialog } from "@/components/user-mgt/AddUserDialog";
import { EditUserDialog } from "@/components/user-mgt/EditUserDialog";
import { getUsers, updateUserStatus, type User } from "@/lib/api-client";
import {
	CalendarDays,
	Plus,
	Search,
	Shield,
	SquarePen,
	UserCheck,
	UserMinus,
	Users,
} from "lucide-react";

type UserStatus = "Active" | "Inactive";

function StatusBadge({ status }: { status: UserStatus }) {
	if (status === "Active") {
		return (
			<span className="inline-flex items-center rounded-md bg-[#953002] px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
				Active
			</span>
		);
	}

	return (
		<span className="inline-flex items-center rounded-md bg-[#f2b705] px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
			Inactive
		</span>
	);
}

function toUiStatus(status: string | undefined): UserStatus {
	return status?.toUpperCase() === "INACTIVE" ? "Inactive" : "Active";
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

export default function UserManagementPage() {
	const [query, setQuery] = useState("");
	const [isAddUserOpen, setIsAddUserOpen] = useState(false);
	const [isEditUserOpen, setIsEditUserOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadUsers = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await getUsers();
			setUsers(data);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load users";
			setError(message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadUsers();
	}, [loadUsers]);

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

	const filteredUsers = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		const rows = users.map((user) => ({
			id: user.userId,
			name: user.username,
			email: user.email,
			role: user.role?.name ?? "N/A",
			status: toUiStatus(user.status),
			dateCreated: formatCreatedDate(user.createdAt),
			raw: user,
		}));

		if (!normalizedQuery) {
			return rows;
		}

		return rows.filter((user) => {
			return (
				user.name.toLowerCase().includes(normalizedQuery) ||
				user.email.toLowerCase().includes(normalizedQuery) ||
				user.role.toLowerCase().includes(normalizedQuery)
			);
		});
	}, [query, users]);

	return (
		<div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#e2e2e2] px-6 py-6 md:px-8 md:py-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight text-[#953002]">
							User Management
						</h1>
						<p className="mt-2 text-sm text-slate-600">
							Manage user accounts and access control
						</p>
					</div>

					<Button
						type="button"
						onClick={() => setIsAddUserOpen(true)}
						className="h-10 rounded-md bg-[#953002] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#7f2600]"
					>
						<Plus className="h-4 w-4" />
						Add User
					</Button>
				</section>

				<Card className="rounded-2xl border-0 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
					<CardContent className="p-5 md:p-6">
						<div className="max-w-xl">
							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Search users by name or email..."
									className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-sm placeholder:text-slate-400"
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				<AddUserDialog
					open={isAddUserOpen}
					onOpenChange={setIsAddUserOpen}
					onUserCreated={loadUsers}
				/>

				<EditUserDialog
					open={isEditUserOpen}
					onOpenChange={(open) => {
						setIsEditUserOpen(open);
						if (!open) {
							setSelectedUser(null);
						}
					}}
					user={selectedUser}
					onUserUpdated={loadUsers}
				/>

				<Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
					<CardContent className="p-0">
						<div className="flex items-start justify-between px-5 pt-5">
							<div>
								<h2 className="text-[15px] font-medium text-slate-900">All Users</h2>
								<p className="text-sm text-slate-500">({filteredUsers.length})</p>
							</div>
						</div>

						<div className="overflow-x-auto pb-2">
							<table className="min-w-[900px] w-full border-collapse text-left text-sm">
								<thead>
									<tr className="border-b border-slate-200 text-slate-500">
										<th className="px-5 py-4 font-medium">Name</th>
										<th className="px-5 py-4 font-medium">Email</th>
										<th className="px-5 py-4 font-medium">Role</th>
										<th className="px-5 py-4 font-medium">Status</th>
										<th className="px-5 py-4 font-medium">Date Created</th>
										<th className="px-5 py-4 text-right font-medium">Actions</th>
									</tr>
								</thead>

								<tbody>
									{filteredUsers.map((user) => (
										<tr
											key={user.id}
											className="border-b border-slate-100 text-slate-700 last:border-b-0 hover:bg-slate-50/80"
										>
											<td className="px-5 py-4">
												<div className="flex items-center gap-3">
													<div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#953002]/10 text-[#953002]">
														<Users className="h-4 w-4" />
													</div>
													<span className="font-medium text-slate-900">{user.name}</span>
												</div>
											</td>

											<td className="px-5 py-4 text-slate-600">{user.email}</td>

											<td className="px-5 py-4">
												<Badge
													variant="outline"
													className="rounded-md border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
												>
													{user.role}
												</Badge>
											</td>

											<td className="px-5 py-4">
												<StatusBadge status={user.status} />
											</td>

											<td className="px-5 py-4 text-slate-600">
												<div className="flex items-center gap-2">
													<CalendarDays className="h-3.5 w-3.5 text-slate-400" />
													<span>{user.dateCreated}</span>
												</div>
											</td>

											<td className="px-5 py-4">
												<div className="flex items-center justify-end gap-4">
													<button
														type="button"
														onClick={() => handleOpenEditDialog(user.raw)}
														className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
														aria-label={`Edit ${user.name}`}
													>
														<SquarePen className="h-4 w-4" />
													</button>

													<button
														type="button"
														className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-slate-100 ${
															user.status === "Active"
																? "text-rose-500 hover:text-rose-600"
																: "text-emerald-500 hover:text-emerald-600"
														}`}
														onClick={() => handleToggleStatus(user.raw)}
														aria-label={
															user.status === "Active"
																? `Deactivate ${user.name}`
																: `Activate ${user.name}`
														}
													>
														{user.status === "Active" ? (
															<UserMinus className="h-4 w-4" />
														) : (
															<UserCheck className="h-4 w-4" />
														)}
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{loading && (
							<div className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">
								Loading users...
							</div>
						)}

						{error && (
							<div className="border-t border-slate-100 px-5 py-6 text-sm text-red-600">
								{error}
							</div>
						)}

						{!loading && filteredUsers.length === 0 && (
							<div className="border-t border-slate-100 px-5 py-10 text-center">
								<Shield className="mx-auto h-10 w-10 text-slate-300" />
								<p className="mt-3 text-sm font-medium text-slate-700">No users found</p>
								<p className="mt-1 text-sm text-slate-500">
									Try a different name, email, or role.
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
