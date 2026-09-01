import ParceirosCatalogo from './ParceirosCatalogo';

export const metadata = {
  title: 'Parceiros - Laboratório de Drinks',
  description: 'Conheça nossos parceiros: cantores, pagodeiros, decoradores, cerimonialistas e profissionais para seu evento em Juiz de Fora e região.',
  alternates: {
    canonical: 'https://laboratorio.gabryelamaro.com/parceiros',
  },
  openGraph: {
    title: 'Parceiros - Laboratório de Drinks',
    description: 'Conheça os profissionais recomendados pelo Laboratório de Drinks para seu evento.',
    url: 'https://laboratorio.gabryelamaro.com/parceiros',
  },
};

export default function Page() {
  return <ParceirosCatalogo />;
}
