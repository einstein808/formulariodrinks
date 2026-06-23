import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';

const s3Client = new S3Client({
  endpoint: 'https://s3.gabryelamaro.com',
  region: 'us-east-1', // dummy region required by S3 SDK
  credentials: {
    accessKeyId: '3Lut3Uey3fSGdVb8gL6b',
    secretAccessKey: 'nNN4YwBcJPtiwvRimGTDiJZp1W6SP0jKjsM46PlI',
  },
  forcePathStyle: true, // Required for MinIO
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 300000, // 5 minutos (300.000 ms)
    socketTimeout: 300000,     // 5 minutos (300.000 ms)
  }),
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Gerar nome único e limpo para o arquivo
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `${timestamp}_${cleanFileName}`;

    const command = new PutObjectCommand({
      Bucket: 'eventos',
      Key: objectKey,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // URL pública direta do arquivo no MinIO
    const publicUrl = `https://s3.gabryelamaro.com/eventos/${objectKey}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Erro no upload MinIO:', error);
    return NextResponse.json({ error: 'Erro ao fazer upload do arquivo.' }, { status: 500 });
  }
}
