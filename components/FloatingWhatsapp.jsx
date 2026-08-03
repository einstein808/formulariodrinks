"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

export default function FloatingWhatsapp() {
  const pathname = usePathname();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const generalRef = ref(db, 'config/general');
    const unsubscribe = onValue(generalRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let phoneVal = data.whatsappNumber || '';
        if (!phoneVal && data.adminPhone) {
          phoneVal = data.adminPhone.split(',')[0].trim();
        }
        if (phoneVal) {
          // Remove non-digit characters
          const cleanNum = phoneVal.replace(/\D/g, '');
          // Prepend country code 55 if not present
          const formatted = cleanNum.startsWith('55') ? cleanNum : `55${cleanNum}`;
          setWhatsappNumber(formatted);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Do not show on admin routes
  const isAdmin = pathname && pathname.startsWith('/admin');
  if (isAdmin || !whatsappNumber) return null;

  const isFormPage = pathname === '/orcamento' || (pathname && pathname.startsWith('/contrato'));
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=Olá! Gostaria de fazer um orçamento de drinks para meu evento.`;

  return (
    <>
      <style jsx global>{`
        @keyframes wa-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(37, 211, 102, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
          }
        }

        .floating-wa-wrapper {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
          display: flex;
          align-items: center;
          gap: 12px;
          pointer-events: auto;
          transition: bottom 0.3s ease, left 0.3s ease, right 0.3s ease;
        }

        @media (max-width: 768px) {
          .floating-wa-wrapper {
            bottom: ${isFormPage ? '105px' : '85px'} !important;
            right: 16px !important;
          }
        }
      `}</style>
      <div
        className="floating-wa-wrapper"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Label Badge on Hover */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'rgba(14, 26, 18, 0.95)',
            border: '1px solid rgba(203, 161, 83, 0.25)',
            color: 'var(--primary)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 'bold',
            textDecoration: 'none',
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateX(0)' : 'translateX(10px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            pointerEvents: isHovered ? 'auto' : 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
            fontFamily: 'sans-serif'
          }}
        >
          Fale Conosco
        </a>

        {/* Floating Green Circle Button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#25D366',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            animation: 'wa-pulse 2s infinite',
            textDecoration: 'none'
          }}
          title="Fale Conosco no WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.381 9.805-9.79.001-2.621-1.013-5.086-2.86-6.937C16.37 2.033 13.916.995 11.3 1.002 5.9.002 1.5 5.385 1.5 10.79c-.002 1.554.41 3.076 1.193 4.437l-.979 3.578 3.673-.963zm13.722-5.467c-.29-.145-1.716-.847-1.978-.942-.262-.096-.452-.144-.643.143-.19.288-.737.942-.904 1.134-.167.19-.333.213-.623.069-.29-.145-1.226-.452-2.335-1.441-.864-.771-1.447-1.724-1.616-2.014-.17-.29-.018-.447.127-.591.13-.13.29-.338.435-.508.145-.17.193-.288.29-.48.096-.19.048-.36-.024-.505-.071-.144-.643-1.547-.88-2.122-.23-.556-.465-.48-.643-.49-.166-.008-.357-.01-.548-.01-.19 0-.501.072-.763.36-.262.288-1.001.978-1.001 2.385s1.025 2.766 1.168 2.956c.143.19 2.017 3.08 4.886 4.318.682.295 1.214.47 1.629.601.685.218 1.31.187 1.802.114.549-.08 1.717-.701 1.957-1.378.24-.678.24-1.26.168-1.378-.072-.119-.263-.19-.553-.335z"/>
          </svg>
        </a>
      </div>
    </>
  );
}
