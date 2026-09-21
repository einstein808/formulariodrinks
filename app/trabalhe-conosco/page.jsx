import TrabalheConoscoClient from './TrabalheConoscoClient';

export const metadata = {
  title: 'Trabalhe Conosco | Cadastro de Freelancers - Laboratório de Drinks',
  description: 'Cadastre-se como bartender, barback ou staff freelancer para eventos e casamentos com o Laboratório de Drinks em Juiz de Fora e região.',
  robots: {
    index: false,
    follow: false
  }
};

export default function TrabalheConoscoPage() {
  return <TrabalheConoscoClient />;
}


