'use client';
import React from 'react';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/56923708742"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg z-40 transition-all duration-300 hover:scale-110"
      aria-label="Contactar por WhatsApp"
    >
      <ChatBubbleLeftRightIcon className="h-6 w-6" />
    </a>
  );
}
