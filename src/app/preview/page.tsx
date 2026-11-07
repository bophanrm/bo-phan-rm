'use client';

import React, { useState } from 'react';
import { Smartphone, Monitor, RefreshCw, QrCode, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MobilePreviewPage() {
  const [device, setDevice] = useState<'iphone' | 'android'>('iphone');
  const [key, setKey] = useState(0);

  const localIp = '192.168.1.12';
  const port = '3001';
  const lanUrl = `http://${localIp}:${port}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(lanUrl)}`;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {/* Top Navigation Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về ứng dụng chính</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-sm font-bold text-white tracking-wide">
              Chế Độ Xem & Giả Lập Điện Thoại (Mobile View)
            </h1>
          </div>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center space-x-2 bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs font-medium">
          <button
            onClick={() => setDevice('iphone')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
              device === 'iphone' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone 16 Pro</span>
          </button>
          <button
            onClick={() => setDevice('android')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
              device === 'android' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Galaxy S24</span>
          </button>
          <button
            onClick={() => setKey((prev) => prev + 1)}
            title="Tải lại giả lập"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Container: Mobile Frame + QR Info */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
        {/* Left / Center: Interactive Smartphone Mockup */}
        <div className="relative">
          {/* Phone Outer Shell */}
          <div
            className={`relative rounded-[50px] p-3 shadow-2xl transition-all ${
              device === 'iphone'
                ? 'bg-slate-800 ring-4 ring-slate-700 shadow-blue-500/10'
                : 'bg-zinc-800 ring-4 ring-zinc-700 shadow-emerald-500/10'
            }`}
            style={{ width: '390px', height: '810px' }}
          >
            {/* Phone Bezel */}
            <div className="w-full h-full bg-black rounded-[42px] overflow-hidden relative border border-slate-700/50 flex flex-col">
              {/* Dynamic Island / Punch Hole */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                {device === 'iphone' ? (
                  <div className="w-24 h-5 bg-black rounded-full border border-slate-800/80 flex items-center justify-end pr-2 space-x-1">
                    <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700" />
                  </div>
                ) : (
                  <div className="w-3.5 h-3.5 bg-black rounded-full border border-slate-800" />
                )}
              </div>

              {/* Status Bar */}
              <div className="h-9 px-6 bg-transparent flex items-center justify-between text-[11px] font-semibold text-slate-900 select-none pointer-events-none z-20">
                <span>9:41</span>
                <div className="flex items-center space-x-1.5 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Web Content Iframe */}
              <iframe
                key={key}
                src="/"
                title="Bộ Phận RM Mobile View"
                className="w-full flex-1 border-none bg-slate-50"
              />

              {/* Home Indicator Bar */}
              <div className="h-5 bg-transparent flex items-center justify-center pointer-events-none z-20">
                <div className="w-32 h-1 bg-slate-400/80 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Connect Real Smartphone Section */}
        <div className="w-full lg:w-96 space-y-5 bg-slate-800/60 p-5 rounded-3xl border border-slate-700/80 backdrop-blur-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-800/60">
              Điện Thoại Thật (iOS / Android)
            </span>
            <h3 className="text-base font-extrabold text-white mt-2">
              Mở Trực Tiếp Trên Điện Thoại Của Bạn
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Quét mã QR bằng Camera điện thoại khi đang kết nối cùng mạng <strong>Wi-Fi</strong> với máy tính để trải nghiệm.
            </p>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-3.5 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Scan QR code to open Bộ Phận RM on phone"
              className="w-44 h-44 rounded-xl"
            />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Quét Để Mở Trên Safari / Chrome
            </span>
          </div>

          {/* Direct Local Link */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Hoặc gõ địa chỉ này vào trình duyệt điện thoại:</span>
            <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-700 text-xs font-mono text-emerald-400 select-all">
              <span>{lanUrl}</span>
              <a
                href={lanUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Mở tab mới"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Shortcut Tip */}
          <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs space-y-1 text-blue-200">
            <p className="font-bold text-white flex items-center space-x-1.5">
              <span>💡 Mẹo xem mobile trên máy tính:</span>
            </p>
            <p className="text-[11px] leading-relaxed text-blue-300">
              Nhấn tổ hợp phím: <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-white font-mono">Cmd + Option + I</kbd> sau đó nhấn <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-white font-mono">Cmd + Shift + M</kbd> để bật chế độ giả lập điện thoại chuẩn của trình duyệt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
