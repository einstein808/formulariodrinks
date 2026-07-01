import { ref, get } from 'firebase/database';
import { db } from '../../../lib/firebase';
import EventoDetalhesClient from './EventoDetalhesClient';

const fallbacks = {
  casamento: {
    label: 'Casamento',
    icon: '💍',
    desc: 'O brinde perfeito para o seu grande dia. Desenvolvemos uma carta de drinks sob medida com atendimento de altíssimo padrão, barmen uniformizados e insumos premium. Surpreenda seus convidados com coquetéis clássicos e criações moleculares exclusivas que combinam perfeitamente com a sofisticação da sua festa.',
    image: ''
  },
  aniversario: {
    label: 'Aniversário',
    icon: '🎂',
    desc: 'Celebre a vida com muito estilo e diversão. Nosso serviço de bar para aniversários leva estruturas dinâmicas, barmen animados e um menu de drinks completo que agrada a todas as idades. Das opções mais refrescantes aos drinks tropicais clássicos, criamos a atmosfera perfeita para a sua festa.',
    image: ''
  },
  corporativo: {
    label: 'Corporativo',
    icon: '🏢',
    desc: 'Sofisticação, agilidade e profissionalismo para destacar a sua marca. Oferecemos uma estrutura de bar executivo de alta performance para confraternizações empresariais, lançamento de produtos, feiras e congressos. Um serviço impecável projetado para impressionar seus clientes e colaboradores.',
    image: ''
  },
  formatura: {
    label: 'Formatura',
    icon: '🎓',
    desc: 'A celebração máxima da sua conquista merece um bar inesquecível. Levamos drinks modernos, shots criativos, copos personalizados e muita energia para animar a pista de dança. Projetado especificamente para formandos e seus convidados com alta rotatividade e qualidade impecável.',
    image: ''
  },
  confraternizacao: {
    label: 'Confraternização',
    icon: '🎉',
    desc: 'Reúna amigos, família ou equipe com a melhor experiência de coquetelaria. Oferecemos um serviço sob medida para encontros de final de ano ou festas sazonais, com foco em drinks clássicos, caipirinhas perfeitas e atendimento ágil.',
    image: ''
  },
  'cha-bar': {
    label: 'Chá Bar',
    icon: '🍸',
    desc: 'Comemore seu chá bar com coquetéis personalizados, bar temático interativo e um menu descontraído projetado para integrar e divertir seus convidados antes do grande dia.',
    image: ''
  },
  debutante: {
    label: 'Debutante',
    icon: '👑',
    desc: 'Os 15 anos merecem um bar dos sonhos. Desenvolvemos uma linha exclusiva de coquetéis sem álcool super coloridos, milkshakes gourmets e drinks com efeitos visuais incríveis (alquimia da fumaça e espumas artesanais) para os jovens, além de uma carta clássica premium para os adultos.'
  }
};

async function getEventoData(id) {
  try {
    const snapshot = await get(ref(db, `config/tiposEvento/${id}`));
    if (snapshot.exists()) {
      return { id, ...snapshot.val() };
    }
  } catch (err) {
    console.error("Erro ao carregar evento no servidor:", err);
  }

  if (fallbacks[id]) {
    return { id, ...fallbacks[id] };
  }

  return {
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    icon: '✨',
    desc: 'Criamos uma estrutura de bar completa com atendimento profissional e coquetéis personalizados para tornar seu evento memorável.'
  };
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const evento = await getEventoData(id);
  const title = `Bar para ${evento.label} em Juiz de Fora | Laboratório de Drinks`;
  const description = evento.desc ? evento.desc.substring(0, 155) + '...' : '';

  return {
    title,
    description,
    alternates: {
      canonical: `/eventos/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `https://laboratorio.gabryelamaro.com/eventos/${id}`,
      siteName: 'Laboratório de Drinks',
      locale: 'pt_BR',
      type: 'article',
      images: evento.image ? [{ url: evento.image }] : undefined,
    },
  };
}

export default async function EventoDetalhesPage({ params }) {
  const { id } = await params;
  const evento = await getEventoData(id);

  return <EventoDetalhesClient id={id} initialEvento={evento} />;
}
