import { NextResponse } from 'next/server';
import {
  collection,
  doc,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTION_NAME = 'productMetrics';

export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    const metrics = snapshot.docs.map((docSnapshot) => ({
      productId: docSnapshot.id,
      ...docSnapshot.data(),
    }));

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error al obtener métricas de carrito:', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener las métricas de carrito.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { productId, productName, category } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'productId es requerido' },
        { status: 400 }
      );
    }

    const metricsRef = doc(db, COLLECTION_NAME, productId);

    const cartAdds = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(metricsRef);
      const previousData = snapshot.exists() ? snapshot.data() : {};
      const currentCount = snapshot.exists()
        ? Number(previousData.cartAdds || 0)
        : 0;
      const updatedCount = currentCount + 1;

      transaction.set(
        metricsRef,
        {
          productId,
          productName: productName ?? previousData.productName ?? '',
          category: category ?? previousData.category ?? 'otros',
          cartAdds: updatedCount,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return updatedCount;
    });

    return NextResponse.json({ productId, cartAdds });
  } catch (error) {
    console.error('Error al registrar métrica de carrito:', error);
    return NextResponse.json(
      { error: 'No se pudieron registrar las métricas de carrito.' },
      { status: 500 }
    );
  }
}
