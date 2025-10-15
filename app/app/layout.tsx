import AppNavLayout from "../../components/AppNavLayout";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppNavLayout>{children}</AppNavLayout>;
}
