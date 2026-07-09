import ThemeCustomizer from '../../components/ThemeCustomizer';

export const metadata = {
  title: 'Painel Administrativo | Laboratório de Drinks',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }) {
  return (
    <>
      <ThemeCustomizer />
      {children}
    </>
  );
}
