'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UploadDocumentDialog } from '@/components/ui/upload-document-dialog';
import { FileText, Clock, Eye, Download, Upload, Bell, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { getDocuments, Document } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface WorkflowInstance {
  id: string;
  workflowName: string;
  status: string;
  documentId: string;
  dueDate: string;
  priority: string;
  createdAt: string;
}

interface AuditLog {
  log_id: string;
  user_id: string;
  action: string;
  entity_id: string;
  timestamp: string;
  ip: string;
  status: string;
}

interface DashboardStats {
  myDocuments: number;
  submittedWorkflows: number;
  notifications: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    myDocuments: 0,
    submittedWorkflows: 0,
    notifications: 0,
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const testUserId = '0b0f8543-672e-4a5a-bb8d-99da74f94f90';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      let workflowsCount = 0;
      let notificationsCount = 0;

      // Fetch documents
      const docsData = await getDocuments();
      const docsList = Array.isArray(docsData) ? docsData : [];
      setDocuments(docsList.slice(0, 4)); // Show only first 4 documents

      // Fetch workflows
      try {
        const workflowsResponse = await fetch('http://localhost:8081/api/workflows', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (workflowsResponse.ok) {
          const workflowsData = await workflowsResponse.json();
          const workflowsList = Array.isArray(workflowsData) ? workflowsData : [];
          workflowsCount = workflowsList.length;
          setWorkflows(workflowsList.slice(0, 3)); // Show only first 3 workflows
        }
      } catch (err) {
        console.log('Workflows fetch skipped:', err);
      }

      // Fetch recent activity
      try {
        const activityResponse = await fetch('http://localhost:8081/admin/logs', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          const activityList = Array.isArray(activityData) ? activityData : [];
          setRecentActivity(activityList.slice(0, 4)); // Show only last 4 activities
        }
      } catch (err) {
        console.log('Activity fetch skipped:', err);
      }

      // Fetch notifications
      try {
        const notifResponse = await fetch(`http://localhost:8081/api/notifications?userId=${testUserId}`);
        if (notifResponse.ok) {
          const notifData = await notifResponse.json();
          const notifications = Array.isArray(notifData) ? notifData : [];
          notificationsCount = notifications.length;
        }
      } catch (err) {
        console.log('Notifications fetch skipped:', err);
      }

      // Update stats with correct counts
      setStats({
        myDocuments: docsList.length,
        submittedWorkflows: workflowsCount,
        notifications: notificationsCount,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateWithTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('approved')) {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    } else if (statusLower.includes('pending')) {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    } else if (statusLower.includes('review')) {
      return <Badge className="bg-blue-100 text-blue-800">In Review</Badge>;
    } else if (statusLower.includes('rejected')) {
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
  };

  const getActivityIcon = (action: string) => {
    const actionLower = action?.toLowerCase() || '';
    if (actionLower.includes('approved')) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (actionLower.includes('upload') || actionLower.includes('created')) return <Upload className="w-5 h-5 text-blue-600" />;
    if (actionLower.includes('download')) return <Download className="w-5 h-5 text-purple-600" />;
    if (actionLower.includes('error') || actionLower.includes('failed')) return <AlertCircle className="w-5 h-5 text-red-600" />;
    return <Clock className="w-5 h-5 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader className="w-8 h-8 animate-spin text-gray-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-100">
      <UploadDocumentDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />

      {/* Header Section */}
      <div className="px-6 pt-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 text-sm mt-2">Welcome back! Here's your document activity overview</p>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="space-y-6">
          {/* Error Message */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-800">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* My Documents Card */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">My Documents</p>
                <p className="text-3xl font-bold text-gray-900">{stats.myDocuments}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submitted Workflows Card */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Submitted Workflows</p>
                <p className="text-3xl font-bold text-gray-900">{stats.submittedWorkflows}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Notifications</p>
                <p className="text-3xl font-bold text-gray-900">{stats.notifications}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Documents Section */}
        <div className="lg:col-span-2">
          <Card className="border border-gray-200">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">My Documents</CardTitle>
                <Button variant="link" className="text-blue-600 p-0 h-auto">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {documents.length === 0 ? (
                <div className="p-6 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No documents yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-t">
                      <TableHead className="px-6">Document</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.document_id}>
                        <TableCell className="px-6">
                          <div>
                            <p className="font-medium text-gray-900">{doc.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(doc.created_at)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.is_locked ? (
                            <Badge className="bg-red-100 text-red-800">Locked</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <button className="p-2 hover:bg-gray-100 rounded">
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded">
                              <Download className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submitted Workflows Section */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-lg">Submitted Workflows</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {workflows.length === 0 ? (
              <div className="p-6 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No workflows yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="p-4 hover:bg-gray-50">
                    <p className="font-medium text-sm text-gray-900 mb-2">{workflow.workflowName}</p>
                    <p className="text-xs text-gray-500 mb-2">
                      Submitted {formatDate(workflow.createdAt || '')}
                    </p>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(workflow.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="bg-[#953002] hover:bg-[#7a2401] text-white font-medium px-6 h-10 rounded-md shadow-sm transition-all"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity Section */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivity.length === 0 ? (
            <div className="p-6 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentActivity.map((activity) => (
                <div key={activity.log_id} className="p-4 hover:bg-gray-50 flex items-start gap-3">
                  <div className="mt-1">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateWithTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
