import { redirect } from 'next/navigation';

/**
 * /admin root — redirects to /admin/orders (the main admin page).
 */
export default function AdminRootPage() {
  redirect('/admin/orders');
}
