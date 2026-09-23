import { NextResponse } from 'next/server';
import { ref, set } from 'firebase/database';
import { db } from '../../../lib/firebase';

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://formsbar-default-rtdb.firebaseio.com';

export async function POST(request) {
  try {
    const data = await request.json();

    if (!data || !data.nome || !data.telefone) {
      return NextResponse.json(
        { success: false, error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    const candId = data.id || `cand_${Date.now()}`;
    const payload = {
      ...data,
      id: candId,
      criadoEm: data.criadoEm || new Date().toISOString()
    };

    // 1. Tenta salvar via REST API direto no Realtime Database (rápido, sem overhead de WebSocket)
    let saved = false;
    try {
      const cleanDbUrl = DB_URL.replace(/\/$/, '');
      const restEndpoint = `${cleanDbUrl}/candidatos_freelancers/${candId}.json`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(restEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        saved = true;
      }
    } catch (restErr) {
      console.warn('Tentativa via REST falhou ou deu timeout, tentando via SDK:', restErr.message);
    }

    // 2. Se REST não salvou, tenta via SDK com timeout de 3 segundos
    if (!saved) {
      try {
        const sdkPromise = set(ref(db, `candidatos_freelancers/${candId}`), payload);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firebase SDK timeout')), 3000)
        );
        await Promise.race([sdkPromise, timeoutPromise]);
        saved = true;
      } catch (sdkErr) {
        console.error('Tentativa via Firebase SDK falhou:', sdkErr.message);
      }
    }

    if (saved) {
      return NextResponse.json({ success: true, id: candId });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'PERMISSION_OR_TIMEOUT',
        message: 'Não foi possível salvar automaticamente. Verifique as regras do Firebase Database.' 
      },
      { status: 500 }
    );
  } catch (err) {
    console.error('Erro na rota /api/candidatos:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
