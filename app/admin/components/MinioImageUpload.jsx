import React, { useState } from 'react';
import { FiUploadCloud } from 'react-icons/fi';

const compressImage = (file, maxWidth = 1280, quality = 0.75) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const originalName = file.name;
            const lastDotIndex = originalName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
            const newName = `${baseName}.webp`;

            const compressedFile = new File([blob], newName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/webp', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function MinioImageUpload({ value, onChange, placeholder = 'https://link-da-imagem.jpg', accept = 'image/*' }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo de arquivo baseado no accept
    const isImageOnly = accept.includes('image') && !accept.includes('pdf') && !accept.includes('application/pdf');
    const isVideoOnly = accept.includes('video');
    const isPdfOnly = (accept.includes('pdf') || accept.includes('application/pdf')) && !accept.includes('image');
    const isImageOrPdf = accept.includes('image') && (accept.includes('pdf') || accept.includes('application/pdf'));

    if (isImageOnly && !file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }
    if (isPdfOnly && file.type !== 'application/pdf') {
      alert('Por favor, selecione apenas um arquivo PDF.');
      return;
    }
    if (isImageOrPdf && !file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo de imagem ou PDF.');
      return;
    }
    if (isVideoOnly && !file.type.startsWith('video/')) {
      alert('Por favor, selecione apenas arquivos de vídeo.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      if (file.type === 'image/gif') {
        const fileSizeInMB = file.size / (1024 * 1024);
        if (fileSizeInMB > 5) {
          const confirmUpload = window.confirm(
            `Este GIF tem ${fileSizeInMB.toFixed(1)}MB. GIFs animados não podem ser comprimidos no navegador para não perderem a animação. O upload pode demorar alguns minutos. Deseja continuar?`
          );
          if (!confirmUpload) {
            setUploading(false);
            return;
          }
        }
      } else {
        try {
          fileToUpload = await compressImage(file);
        } catch (err) {
          console.error("Erro na compressão:", err);
        }
      }
    } else if (file.type.startsWith('video/')) {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB > 30) {
        const confirmUpload = window.confirm(
          `Este vídeo tem ${fileSizeInMB.toFixed(1)}MB. Vídeos maiores que 30MB podem falhar no upload devido a limites de conexão do servidor (Timeouts de Nginx/Cloudflare). Deseja tentar mesmo assim?`
        );
        if (!confirmUpload) {
          setUploading(false);
          return;
        }
      }
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.url) {
            onChange(data.url);
          } else {
            alert('Erro ao subir arquivo: resposta inválida do servidor.');
          }
        } catch (e) {
          alert('Erro ao processar resposta do servidor.');
        }
      } else {
        alert(`Erro ao subir arquivo (${xhr.status}).`);
      }
      setUploading(false);
      setUploadProgress(0);
    };

    xhr.onerror = () => {
      alert('Ocorreu um erro de conexão ao fazer o upload do arquivo.');
      setUploading(false);
      setUploadProgress(0);
    };

    xhr.send(formData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {value && (
          <div 
            style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '6px', 
              border: '1px solid rgba(203, 161, 83, 0.25)', 
              overflow: 'hidden', 
              background: '#000', 
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {value.match(/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i) || accept.includes('video') ? (
              <span style={{ fontSize: '1.2rem' }}>🎬</span>
            ) : value.match(/\.pdf(\?.*)?$/i) || accept.includes('pdf') || accept.includes('application/pdf') ? (
              <span style={{ fontSize: '1.2rem' }}>📄</span>
            ) : (
              <img 
                src={value} 
                alt="Preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>
        )}
        <label 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer', 
            fontSize: '0.8rem', 
            padding: '10px 16px',
            background: 'rgba(203, 161, 83, 0.08)',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            borderRadius: '6px',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            opacity: uploading ? 0.6 : 1,
            pointerEvents: uploading ? 'none' : 'auto',
            flexShrink: 0
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(203, 161, 83, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(203, 161, 83, 0.08)'; }}
        >
          <FiUploadCloud size={16} />
          {uploading 
            ? `Enviando... ${uploadProgress}% ⏳` 
            : accept.includes('video') 
              ? 'Selecionar Vídeo' 
              : (accept.includes('pdf') || accept.includes('application/pdf')) 
                ? (accept.includes('image') ? 'Selecionar Foto ou PDF' : 'Selecionar PDF')
                : 'Selecionar Foto'
          }
          <input 
            type="file" 
            accept={accept} 
            onChange={handleFileChange} 
            disabled={uploading}
            style={{ display: 'none' }} 
          />
        </label>
      </div>
      <input 
        type="text" 
        className="form-input" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
    </div>
  );
}
