import Footer from "@/components/shared/navigation/footer";
import Header from "@/components/shared/navigation/header";
import PurchaseAccountReminder from "@/components/shared/purchase-account-reminder";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      <PurchaseAccountReminder />
      {children}

      <Footer />
    </div>
  );
}
