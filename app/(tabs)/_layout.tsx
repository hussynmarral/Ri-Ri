// Redirects legacy (tabs) routes to (main)
import { Redirect } from 'expo-router';
export default function TabsRedirect() {
  return <Redirect href={'/(main)' as any} />;
}
