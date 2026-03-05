import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const { orderData, cartItems } = await request.json();

    // Registrar el pedido en Firebase
    const orderRef = doc(db, 'whatsappOrders', new Date().toISOString());
    await setDoc(orderRef, {
      ...orderData,
      cartItems,
      timestamp: new Date().toISOString(),
      status: 'sent'
    });

    // Incrementar el contador de pedidos
    const counterRef = doc(db, 'counters', 'whatsappOrders');
    const counterDoc = await getDoc(counterRef);
    
    if (counterDoc.exists()) {
      await setDoc(counterRef, {
        count: increment(1),
        lastOrder: new Date().toISOString()
      }, { merge: true });
    } else {
      await setDoc(counterRef, {
        count: 1,
        lastOrder: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido registrado exitosamente',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to register WhatsApp order',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Obtener el contador actual
    const counterRef = doc(db, 'counters', 'whatsappOrders');
    const counterDoc = await getDoc(counterRef);
    
    if (counterDoc.exists()) {
      const data = counterDoc.data();
      return NextResponse.json({
        success: true,
        count: data.count || 0,
        lastOrder: data.lastOrder || null,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: true,
        count: 0,
        lastOrder: null,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get WhatsApp orders count',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
