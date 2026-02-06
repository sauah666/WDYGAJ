import React, { ReactNode, useEffect, useRef } from 'react';
import { Settings, Grid, Cpu, Flame, Nut, Cog, Gauge, Anchor } from 'lucide-react';
import * as THREE from 'three';

interface LayoutProps {
  children: ReactNode;
  title: string;
  activeProductName?: string | null;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
  onSettingsClick?: () => void;
  hideSidebar?: boolean; // New prop for Landing Mode
}

const SteamEngineBackground = React.memo(() => {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // Scene Setup
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0503, 0.002);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffaa00, 0.2);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xff6600, 10, 50);
        pointLight.position.set(2, 3, 4);
        scene.add(pointLight);
        
        const pointLight2 = new THREE.PointLight(0x0044ff, 5, 50);
        pointLight2.position.set(-5, -2, 2);
        scene.add(pointLight2);

        // Geometries (Abstract Engine Parts)
        const geometry = new THREE.TorusKnotGeometry(1.5, 0.4, 100, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xb87333, // Bronze
            roughness: 0.3,
            metalness: 0.8,
            wireframe: true 
        });
        const core = new THREE.Mesh(geometry, material);
        scene.add(core);

        // Ring
        const ringGeo = new THREE.TorusGeometry(3.5, 0.1, 16, 100);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x44403c, metalness: 0.9, roughness: 0.5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);

        // Animation Loop
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);

            core.rotation.x += 0.003;
            core.rotation.y += 0.005;

            ring.rotation.z -= 0.002;
            ring.rotation.x = Math.PI / 2 + Math.sin(Date.now() * 0.0005) * 0.2;

            renderer.render(scene, camera);
        };
        animate();

        // Resize Handler
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
            geometry.dispose();
            material.dispose();
            ringGeo.dispose();
            ringMat.dispose();
            renderer.dispose();
        };
    }, []);

    return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen" />;
});

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title, 
  activeProductName, 
  currentRoute, 
  onNavigate,
  onSettingsClick,
  hideSidebar = false
}) => {
  return (
    <div className="flex flex-col md:flex-row h-full bg-[#0a0503] text-[#e7e5e4] font-cursive selection:bg-amber-600/50 relative overflow-hidden text-xl">
      
      {/* --- WORLD LAYER (Background) --- */}
      <SteamEngineBackground />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0503] via-transparent to-[#1a0f0a] pointer-events-none z-0"></div>
      
      {/* --- MOBILE-FIRST NAVIGATION (Bottom on Mobile, Left on Desktop) --- */}
      {!hideSidebar && (
        <aside className={`
            z-40 bg-[#140c08] shadow-[10px_0_30px_rgba(0,0,0,0.9)] 
            flex md:flex-col items-center justify-around md:justify-start 
            w-full md:w-80 h-20 md:h-full 
            order-last md:order-first 
            border-t-4 md:border-t-0 md:border-r-8 border-[#2e1d15] md:py-6
            relative
        `}>
            {/* Desktop-Only: Logo Area */}
            <div className="hidden md:flex flex-col w-full px-6 mb-10 items-center gap-4 relative">
                <div className="relative w-16 h-16 bg-[#221510] rounded-full border-4 border-[#5c3a21] shadow-[inset_0_0_15px_black] flex items-center justify-center group overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_60%,#000_100%)] z-10"></div>
                    <div className="absolute inset-1 border-2 border-dashed border-[#b45309]/30 rounded-full animate-spin-slow"></div>
                    <Nut size={32} className="text-[#d97706] drop-shadow-[0_0_10px_orange]" />
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 rounded-t-full pointer-events-none"></div>
                </div>
                <div className="flex flex-col text-center">
                    <span className="font-bold text-2xl tracking-[0.1em] text-[#d97706] uppercase drop-shadow-[0_2px_0_black] font-serif leading-none" style={{ textShadow: '0 0 10px #b45309' }}>
                        Машинариум
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-[#78350f] font-bold bg-[#291810] px-1 rounded border border-[#451a03] font-mono mt-1">
                        Барабашкина С.Д.
                    </span>
                </div>
            </div>

            {/* Navigation Controls (Horizontal on Mobile, Vertical on Desktop) */}
            <nav className="flex-1 w-full flex md:flex-col items-center md:items-stretch justify-around md:justify-start md:px-4 md:space-y-6">
                
                {/* 1. MAIN LEVER (Dashboard) */}
                <button 
                    onClick={() => onNavigate?.('MODE_SELECTION')}
                    className={`flex items-center justify-center md:justify-start p-2 md:p-4 rounded-xl transition-all duration-200 relative overflow-hidden group
                    ${(!activeProductName && !currentRoute?.includes('SETTINGS')) 
                        ? 'text-[#fbbf24] md:bg-[#2e1d15] md:border-2 md:border-[#d97706] md:shadow-[0_0_20px_rgba(217,119,6,0.3)]' 
                        : 'text-[#78350f] hover:text-[#d97706]'
                    }`}
                >
                    <Grid size={24} className={(!activeProductName && !currentRoute?.includes('SETTINGS')) ? 'animate-pulse' : ''} />
                    <span className="hidden md:block ml-4 font-bold tracking-widest uppercase text-lg font-serif">Рубка</span>
                </button>

                {/* 2. ACTIVE JOB (Status) */}
                {activeProductName && (
                    <div className="relative group">
                         {/* Mobile Indicator */}
                         <div className="md:hidden">
                            <Cpu size={24} className="text-[#fbbf24] animate-pulse" />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></div>
                         </div>

                         {/* Desktop Card */}
                         <div className="hidden md:block w-full p-4 bg-gradient-to-r from-[#451a03] to-[#1a0f0a] border border-[#d97706]/50 text-[#fbbf24] relative overflow-hidden shadow-inner rounded-2xl">
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
                             <div className="flex items-center">
                                <Cpu size={24} className="text-[#fbbf24] group-hover:rotate-180 transition-transform duration-1000" />
                                <span className="ml-4 font-bold truncate text-xl font-serif tracking-wide">
                                    {activeProductName === 'JobSearch Agent' ? 'Симфоний Б.' : activeProductName}
                                </span>
                             </div>
                             <div className="absolute bottom-0 left-0 w-full h-1/2 bg-white/5 blur-md pointer-events-none"></div>
                         </div>
                    </div>
                )}

                {/* 3. SETTINGS (Config) */}
                <button 
                    onClick={onSettingsClick}
                    className={`flex items-center justify-center md:justify-start p-2 md:p-3 rounded-xl transition-all duration-300 group md:border md:border-dashed
                    ${currentRoute === 'SETTINGS' ? 'text-[#d97706] md:border-[#d97706] md:bg-[#2e1d15]' : 'text-[#57534e] md:border-[#452c20] hover:text-[#a8a29e]'}`}
                >
                    <Settings size={24} className="group-hover:rotate-90 transition-transform duration-700 ease-in-out" />
                    <span className="hidden md:block ml-3 font-bold tracking-wider uppercase text-xs font-serif">Механика</span>
                </button>
            </nav>
        </aside>
      )}

      {/* --- MAIN CHAMBER --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 order-first md:order-last">
        
        {/* LANDING MODE: Custom Branding Header - CENTERED, NO LOGO, NO SUBTITLE */}
        {hideSidebar && (
            <div className="absolute top-8 left-0 right-0 z-50 flex justify-center items-center animate-in fade-in slide-in-from-top duration-1000 pointer-events-none">
                <div className="drop-shadow-2xl">
                    <h1 className="text-4xl md:text-6xl font-serif font-black text-[#d6d3d1] tracking-[0.1em] uppercase text-shadow leading-none text-center">
                        <span className="text-[#fbbf24]">М</span>АШИНАРИУМ
                    </h1>
                </div>
            </div>
        )}

        {/* STANDARD MODE: Dashboard Top Plate */}
        {!hideSidebar && (
            <header className="shrink-0 h-20 md:h-28 bg-[#140c08] border-b-[8px] md:border-b-[12px] border-[#2e1d15] flex items-center px-4 md:px-10 justify-between shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative z-30 rounded-bl-[1.5rem] md:rounded-bl-[3rem] mx-0 md:mx-4 mt-0">
                {/* Bolts */}
                <div className="absolute bottom-2 left-4 md:bottom-4 md:left-10 w-3 h-3 md:w-5 md:h-5 rounded-full bg-gradient-to-br from-[#5c3a21] to-[#291810] shadow-[1px_1px_2px_black] flex items-center justify-center"><div className="w-1.5 h-0.5 bg-black/40 rotate-45"></div></div>
                <div className="absolute bottom-2 right-4 md:bottom-4 md:right-10 w-3 h-3 md:w-5 md:h-5 rounded-full bg-gradient-to-br from-[#5c3a21] to-[#291810] shadow-[1px_1px_2px_black] flex items-center justify-center"><div className="w-1.5 h-0.5 bg-black/40 rotate-45"></div></div>

                <div className="pl-6 md:pl-0 flex items-center gap-4">
                    {/* Mobile Logo Mini */}
                    <div className="md:hidden relative w-10 h-10 bg-[#221510] rounded-full border-2 border-[#5c3a21] flex items-center justify-center">
                        <Nut size={20} className="text-[#d97706]" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-5xl font-serif font-black text-[#d6d3d1] tracking-normal uppercase text-shadow-heavy drop-shadow-xl text-transparent bg-clip-text bg-gradient-to-b from-[#e7e5e4] to-[#78716c]">
                        {title}
                        </h1>
                        <div className="h-1 md:h-2 w-16 md:w-48 bg-gradient-to-r from-[#d97706] via-[#b45309] to-transparent mt-1 md:mt-2 rounded-full shadow-[0_0_15px_orange] border border-[#451a03]"></div>
                    </div>
                </div>
                
                {/* Gauge Cluster (Hidden on small mobile) */}
                <div className="hidden lg:flex items-center space-x-6">
                    <div className="relative w-16 h-16 bg-black rounded-full border-4 border-[#5c3a21] shadow-inner flex items-center justify-center">
                        <Gauge size={32} className="text-[#fbbf24] animate-pulse" />
                        <div className="absolute bottom-[-20px] text-[9px] font-bold text-[#78716c] uppercase tracking-widest bg-[#140c08] px-2 rounded font-mono">ДАВЛЕНИЕ</div>
                    </div>
                    <div className="relative w-16 h-16 bg-black rounded-full border-4 border-[#5c3a21] shadow-inner flex items-center justify-center">
                        <Cog size={32} className="text-[#fbbf24] animate-spin-slow" />
                        <div className="absolute bottom-[-20px] text-[9px] font-bold text-[#78716c] uppercase tracking-widest bg-[#140c08] px-2 rounded font-mono">ОБОРОТЫ</div>
                    </div>
                </div>
            </header>
        )}

        {/* Viewport / Workbench */}
        <div className={`flex-1 overflow-auto relative z-10 custom-scrollbar ${hideSidebar ? 'p-0' : 'p-2 md:p-8 lg:p-10'}`}>
          <div className="absolute inset-0 shadow-[inset_0_0_100px_black] pointer-events-none z-0"></div>
          <div className="max-w-[1920px] mx-auto h-full relative z-10 flex flex-col justify-center">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};