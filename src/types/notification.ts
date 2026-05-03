/*
 This interface defines the structure of a notification object to ensure consistency across the frontend and backend.
 */
export interface Notification {
  notificationId: string; 
  user_id: string;        
  message: string;        
  read?: boolean; 
  isRead?: boolean;       
  createdAt: string;
}