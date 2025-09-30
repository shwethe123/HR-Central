
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Announcement } from '@/types';
import AppLayoutClient from './app-layout-client';

async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const announcementsRef = collection(db, 'announcements');
    const q = query(announcementsRef, orderBy('createdAt', 'desc'), limit(5));
    const querySnapshot = await getDocs(q);
    const fetchedAnnouncements: Announcement[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Convert Timestamps to serializable objects
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toJSON() || null,
        publishedAt: data.publishedAt?.toJSON() || null,
        updatedAt: data.updatedAt?.toJSON() || null,
      } as Announcement;
    });
    return fetchedAnnouncements;
  } catch (error) {
    console.error("Error fetching announcements on server:", error);
    // In a server component, we can't use toasts, so we'll just return an empty array on error.
    return [];
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const announcements = await getAnnouncements();

  return (
    <AppLayoutClient announcements={announcements}>
      {children}
    </AppLayoutClient>
  );
}
