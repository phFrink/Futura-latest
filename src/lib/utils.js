import { clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


export  const formattedDate = (date) => {
  // Check if the date is a valid Date object or valid date string
  const parsedDate = new Date(date);
  
  if (isNaN(parsedDate)) {
    // Return a default value or error message if the date is invalid
    return "Invalid Date";
  }

  return format(parsedDate, "MMM d, yyyy, p");
};

// Check if an item is newly created (within last 24 hours)
export function isNewItem(createdAt, hoursThreshold = 24) {
  if (!createdAt) return false;
  
  const now = new Date();
  const created = new Date(createdAt);
  
  // Check if date is valid
  if (isNaN(created.getTime())) return false;
  
  const hoursDiff = (now - created) / (1000 * 60 * 60); // Convert to hours
  
  return hoursDiff <= hoursThreshold && hoursDiff >= 0; // Also check it's not in future
}

// Get relative time (e.g., "2 hours ago", "1 day ago")
export function getRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now - past;
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  
  if (diffInHours < 1) {
    const minutes = Math.floor(diffInMs / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInDays);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}