import { NextResponse } from 'next/server';
import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const statsDocRef = doc(db, 'stats', 'site');

export async function GET() {
  try {
    const snapshot = await getDoc(statsDocRef);

    if (!snapshot.exists()) {
      await setDoc(statsDocRef, {
        visits: 0,
        createdAt: new Date().toISOString()
      });
      return NextResponse.json({ visits: 0 });
    }

    const data = snapshot.data();
    return NextResponse.json({ visits: Number(data.visits ?? 0) });
  } catch (error) {
    console.error('Error obteniendo las visitas del sitio:', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener las visitas del sitio' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const visits = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(statsDocRef);
      const currentVisits = snapshot.exists() ? Number(snapshot.data().visits || 0) : 0;
      const updatedVisits = currentVisits + 1;

      transaction.set(
        statsDocRef,
        {
          visits: updatedVisits,
          lastVisitAt: new Date().toISOString()
        },
        { merge: true }
      );

      return updatedVisits;
    });

    return NextResponse.json({ visits });
  } catch (error) {
    console.error('Error incrementando las visitas del sitio:', error);
    return NextResponse.json(
      { error: 'No se pudieron registrar las visitas del sitio' },
      { status: 500 }
    );
  }
}
