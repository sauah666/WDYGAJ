import React, { ReactNode, useEffect, useRef } from 'react';
import { Settings, Grid, Cpu, Flame, Nut, Cog, Gauge } from 'lucide-react';
import * as THREE from 'three';

interface LayoutProps {
  children: ReactNode;
  title: string;
  activeProductName?: string | null;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
  onSettingsClick?: () => void;
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
  onSettingsClick 
}) => {
  return (
    <div className="flex h-full bg-[#0a0503] text-[#e7e5e4] font-mono selection:bg-amber-600/50 relative overflow-hidden">
      
      {/* --- WORLD LAYER --- */}
      <SteamEngineBackground />
      
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0503] via-transparent to-[#1a0f0a] pointer-events-none z-0"></div>
      
      {/* Steam Vent (Bottom Right) */}
      <div className="absolute bottom-0 right-20 w-64 h-64 bg-white/5 blur-[80px] rounded-full animate-pulse pointer-events-none z-0"></div>

      {/* --- SIDEBAR: THE MACHINE CONTROL --- */}
      <aside className="w-24 md:w-80 bg-[#140c08] border-r-8 border-[#2e1d15] flex flex-col py-6 relative z-20 shadow-[10px_0_30px_rgba(0,0,0,0.9)]">
        {/* Brass Pipe Border */}
        <div className="absolute top-0 bottom-0 right-[-6px] w-3 bg-gradient-to-b from-[#78350f] via-[#b45309] to-[#78350f] rounded-full z-30 opacity-90 border-l border-[#451a03]"></div>
        
        {/* Logo / Pressure Gauge Area */}
        <div className="px-6 mb-10 flex items-center gap-4 relative">
          <div className="relative w-16 h-16 bg-[#221510] rounded-full border-4 border-[#5c3a21] shadow-[inset_0_0_15px_black] flex items-center justify-center group overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_60%,#000_100%)] z-10"></div>
            <div className="absolute inset-1 border-2 border-dashed border-[#b45309]/30 rounded-full animate-spin-slow"></div>
            <Nut size={32} className="text-[#d97706] drop-shadow-[0_0_10px_orange]" />
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 rounded-t-full pointer-events-none"></div>
          </div>
          <div className="hidden md:flex flex-col">
            <span className="font-bold text-2xl tracking-[0.2em] text-[#d97706] uppercase drop-shadow-[0_2px_0_black] font-serif" style={{ textShadow: '0 0 10px #b45309' }}>NEXUS</span>
            <span className="text-[9px] uppercase tracking-widest text-[#78350f] font-bold bg-[#291810] px-1 rounded border border-[#451a03]">Steam Core</span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 w-full px-4 space-y-6 relative">
          
          {/* MAIN LEVER */}
          <div className="relative group perspective-1000">
            <button 
                onClick={() => onNavigate?.('MODE_SELECTION')}
                className={`w-full flex items-center p-4 border-2 transition-all duration-200 relative overflow-hidden transform-gpu
                ${(!activeProductName && !currentRoute?.includes('SETTINGS')) 
                    ? 'bg-[#2e1d15] border-[#d97706] text-[#fbbf24] shadow-[0_0_20px_rgba(217,119,6,0.3)] translate-x-2' 
                    : 'bg-[#1a120e] border-[#452c20] text-[#78350f] hover:border-[#78350f] hover:text-[#d97706] hover:translate-x-1'
                }`}
                style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 85%, 90% 100%, 0 100%, 0 15%)' }}
            >
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                
                <Grid size={24} className={(!activeProductName && !currentRoute?.includes('SETTINGS')) ? 'text-[#fbbf24] animate-pulse' : ''} />
                <span className="hidden md:block ml-4 font-bold tracking-widest uppercase text-xs font-serif">Main Deck</span>
                
                {(!activeProductName && !currentRoute?.includes('SETTINGS')) && (
                    <div className="absolute right-2 top-2 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e] animate-ping"></div>
                )}
            </button>
          </div>

          {/* ACTIVE BOILER SLOT */}
          {activeProductName && (
             <div className="mt-8 relative">
                <div className="hidden md:block px-2 mb-2 text-[9px] uppercase tracking-widest text-[#78350f] font-bold flex items-center gap-2">
                    <Flame size={12} className="text-orange-600 animate-bounce" /> Combustion Chamber
                </div>
                <div 
                    className="w-full flex items-center p-4 bg-gradient-to-r from-[#451a03] to-[#1a0f0a] border border-[#d97706]/50 text-[#fbbf24] relative overflow-hidden shadow-inner group"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
                    <Cpu size={24} className="text-[#fbbf24] group-hover:rotate-180 transition-transform duration-1000" />
                    <span className="hidden md:block ml-4 font-bold truncate text-xs font-serif tracking-wide">{activeProductName}</span>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-white/5 blur-md pointer-events-none"></div>
                </div>
             </div>
          )}
        </nav>

        {/* Footer Config */}
        <div className="px-4 mt-auto">
            <button 
                onClick={onSettingsClick}
                className={`w-full flex items-center p-3 border border-dashed transition-all duration-300 group
                ${currentRoute === 'SETTINGS' ? 'border-[#d97706] bg-[#2e1d15] text-[#d97706]' : 'border-[#452c20] text-[#57534e] hover:border-[#78350f] hover:text-[#a8a29e]'}`}
            >
                <Settings size={18} className="group-hover:rotate-90 transition-transform duration-700 ease-in-out" />
                <span className="hidden md:block ml-3 font-bold tracking-wider uppercase text-[10px]">Maintenance</span>
            </button>
        </div>
      </aside>

      {/* Main Chamber - Dashboard Style */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* Header / Dashboard Top Plate */}
        <header className="h-28 bg-[#140c08] border-b-[12px] border-[#2e1d15] flex items-center px-10 justify-between shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative z-30">
          {/* Bolts */}
          <div className="absolute bottom-2 left-6 w-5 h-5 rounded-full bg-gradient-to-br from-[#5c3a21] to-[#291810] shadow-[1px_1px_2px_black] flex items-center justify-center"><div className="w-2 h-0.5 bg-black/40 rotate-45"></div></div>
          <div className="absolute bottom-2 right-6 w-5 h-5 rounded-full bg-gradient-to-br from-[#5c3a21] to-[#291810] shadow-[1px_1px_2px_black] flex items-center justify-center"><div className="w-2 h-0.5 bg-black/40 rotate-45"></div></div>

          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-black text-[#d6d3d1] tracking-tighter uppercase text-shadow-heavy drop-shadow-xl text-transparent bg-clip-text bg-gradient-to-b from-[#e7e5e4] to-[#78716c]">
              {title}
            </h1>
            <div className="h-2 w-48 bg-gradient-to-r from-[#d97706] via-[#b45309] to-transparent mt-2 rounded-full shadow-[0_0_15px_orange] border border-[#451a03]"></div>
          </div>
          
          {/* Gauge Cluster */}
          <div className="hidden md:flex items-center space-x-6">
             <div className="relative w-16 h-16 bg-black rounded-full border-4 border-[#5c3a21] shadow-inner flex items-center justify-center">
                <Gauge size={32} className="text-[#fbbf24] animate-pulse" />
                <div className="absolute bottom-[-20px] text-[9px] font-bold text-[#78716c] uppercase tracking-widest bg-[#140c08] px-2 rounded">PSI</div>
             </div>
             <div className="relative w-16 h-16 bg-black rounded-full border-4 border-[#5c3a21] shadow-inner flex items-center justify-center">
                <Cog size={32} className="text-[#fbbf24] animate-spin-slow" />
                <div className="absolute bottom-[-20px] text-[9px] font-bold text-[#78716c] uppercase tracking-widest bg-[#140c08] px-2 rounded">RPM</div>
             </div>
          </div>
        </header>

        {/* Viewport / Workbench - Metal Plate Background */}
        <div className="flex-1 overflow-auto p-10 relative z-10 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]">
          {/* Inner Shadow to define the viewport depth */}
          <div className="absolute inset-0 shadow-[inset_0_0_100px_black] pointer-events-none z-0"></div>
          
          <div className="max-w-7xl mx-auto h-full relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};