import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import abcd from "./assets/hero.png";
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc 
} from 'firebase/firestore';

declare const __firebase_config: string;
declare const __app_id: string;
declare const __initial_auth_token: string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseApp: any, auth: any, db: any, appId: string;
let isFirebaseAvailable = false;

try {
  if (import.meta.env.VITE_FIREBASE_CONFIG) {
    const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    appId = typeof __app_id !== 'undefined' ? __app_id : 'portfolio-default-app';
    isFirebaseAvailable = true;
  }
} catch (error) {
  console.warn("Inisialisasi Firebase dilewati. Berjalan dalam Mode Demo Standalone.", error);
}

const DEFAULT_PROFILE = {
  name: "Alex Morgan",
  title: "Lead Full-Stack Developer & UI Architect",
  bio: "Saya merancang aplikasi web berkinerja tinggi dengan estetika minimalis. Berfokus pada penciptaan antarmuka digital yang cepat, aksesibel, dan disukai oleh pengguna global.",
  avatarType: "tech", 
  photoUrl: abcd,
  cvUrl: "#",
  linkedin: "https://linkedin.com",
  github: "https://github.com",
  email: "alex.morgan@design.io",
  location: "Jakarta, Indonesia"
};

const DEFAULT_EDUCATION = [
  {
    id: "edu-1",
    school: "Universitas Indonesia",
    degree: "S1 Teknik Informatika",
    year: "2018 - 2022",
    description: "Fokus pada Rekayasa Perangkat Lunak dan Interaksi Manusia-Komputer. Lulus dengan predikat cumlaude."
  }
];

const DEFAULT_EXPERIENCE = [
  {
    id: "exp-1",
    company: "Vercel",
    role: "Senior Frontend Engineer",
    duration: "2024 - Sekarang",
    description: "Memimpin pengembangan sistem desain utama. Mengoptimalkan siklus rendering aplikasi web performa tinggi untuk jutaan pengguna global."
  },
  {
    id: "exp-2",
    company: "Stripe",
    role: "Software Developer",
    duration: "2022 - 2024",
    description: "Membangun antarmuka pembayaran responsif dan dasbor analitik. Mengimplementasikan arsitektur berbasis komponen yang modular."
  }
];

const DEFAULT_PROJECTS = [
  {
    id: "proj-1",
    title: "Zenith Task Manager",
    description: "Aplikasi manajemen tugas minimalis dengan sistem animasi transisi fluid, kemampuan luring, dan kendali pintasan keyboard instan.",
    tech_stack: "React, Tailwind, State Machines",
    githubLink: "https://github.com",
    demoLink: "https://demo.com",
    imageUrl: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "proj-2",
    title: "Aura Analytics Engine",
    description: "Mesin pelacak performa berbasis peramban ringan yang memberikan laporan mikrodetik rendering UI dengan visualisasi SVG modern.",
    tech_stack: "TypeScript, SVG Engine, Tailwind CSS",
    githubLink: "https://github.com",
    demoLink: "https://demo.com",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80"
  }
];

const DEFAULT_RESEARCH = [
  {
    id: "res-1",
    title: "Analisis Dampak Virtual DOM Pada Daya Baterai Mobile",
    description: "Studi komparatif mendalam mengukur konsumsi CPU dan daya baterai pada rendering halaman web kompleks berbasis SPA di perangkat mobile low-end.",
    imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "res-2",
    title: "Kompresi Paket Data Menggunakan Algoritma Modifikasi Huffman",
    description: "Eksperimen optimasi pengiriman payload JSON melalui koneksi jaringan 3G/Edge terbatas untuk sistem logistik real-time.",
    imageUrl: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=600&q=80"
  }
];

const DEFAULT_SKILLS = [
  { id: "sk-1", name: "React / Next.js", category: "Frontend" },
  { id: "sk-2", name: "TypeScript", category: "Frontend" },
  { id: "sk-3", name: "Tailwind CSS", category: "Frontend" },
  { id: "sk-4", name: "Node.js", category: "Backend" },
  { id: "sk-5", name: "Express / GraphQL", category: "Backend" },
  { id: "sk-6", name: "PostgreSQL", category: "Backend" },
  { id: "sk-7", name: "Git & CI/CD", category: "Tools" },
  { id: "sk-8", name: "Figma UI/UX", category: "Tools" }
];

const SVGAvatars = {
   tech: (
    <img
      src={abcd}
      alt="tech"
      className="w-full h-full object-cover rounded-2xl"
    />
  ),
  design: (
    <img
      src={abcd}
      alt="design"
      className="w-full h-full object-cover rounded-2xl"
    />
  ),
  minimal: (
    <img
      src={abcd}
      alt="minimal"
      className="w-full h-full object-cover rounded-2xl"
    />
  )
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("portfolio"); 
  const [cmsTab, setCmsTab] = useState("profile"); 
  const [portfolioWorksTab, setPortfolioWorksTab] = useState("projects"); // 'projects' | 'research'
  const [cmsWorksSubTab, setCmsWorksSubTab] = useState("projects"); 
  
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [education, setEducation] = useState(DEFAULT_EDUCATION);
  const [experience, setExperience] = useState(DEFAULT_EXPERIENCE);
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [research, setResearch] = useState(DEFAULT_RESEARCH);
  const [skills, setSkills] = useState(DEFAULT_SKILLS);

  const [isLive, setIsLive] = useState(false);
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); 

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  const [newSkill, setNewSkill] = useState({ name: "", category: "Frontend" });
  const [newProject, setNewProject] = useState({ title: "", description: "", tech_stack: "", githubLink: "", demoLink: "", imageUrl: "" });
  const [newResearch, setNewResearch] = useState({ title: "", description: "", imageUrl: "" });
  const [newExperience, setNewExperience] = useState({ company: "", role: "", duration: "", description: "" });
  const [newEducation, setNewEducation] = useState({ school: "", degree: "", year: "", description: "" });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // State untuk menampung data karya yang sedang dipilih untuk pop-up modal
  const [selectedWork, setSelectedWork] = useState<any>(null);
  const [workType, setWorkType] = useState<string | null>(null); // 'project' | 'research'

  const triggerPrintCV = () => {
    window.print();
  };

  // Reset pagination ke halaman 1 setiap kali tab portofolio dirubah
  useEffect(() => {
    setCurrentPage(1);
  }, [portfolioWorksTab]);

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return projects.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [projects, currentPage]);

  const totalProjectPages = useMemo(() => {
    return Math.max(1, Math.ceil(projects.length / ITEMS_PER_PAGE));
  }, [projects]);

  const paginatedResearch = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return research.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [research, currentPage]);

  const totalResearchPages = useMemo(() => {
    return Math.max(1, Math.ceil(research.length / ITEMS_PER_PAGE));
  }, [research]);


  const triggerToast = (message: string, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!isFirebaseAvailable) {
      console.log("Firebase tidak terdeteksi. Berjalan dalam local mode.");
      return;
    }

    const initAuthAndSync = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (authError) {
        console.error("Gagal melakukan otentikasi: ", authError);
      }
    };

    initAuthAndSync();

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsLive(true);
        triggerToast("Terhubung dengan Cloud Database Sync", "success");
      } else {
        setUser(null);
        setIsLive(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseAvailable || !user) return;

    const unsubscribers: Array<() => void> = [];

    const profileDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', 'main_profile');
    const unsubProfile = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as typeof DEFAULT_PROFILE);
      } else {
        setDoc(profileDocRef, DEFAULT_PROFILE);
        setProfile(DEFAULT_PROFILE);
      }
    }, (err) => console.error("Error Profil Sync: ", err));
    unsubscribers.push(unsubProfile);

    const eduColRef = collection(db, 'artifacts', appId, 'public', 'data', 'education');
    const unsubEdu = onSnapshot(eduColRef, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setEducation(list.length > 0 ? list : DEFAULT_EDUCATION);
    }, (err) => console.error("Error Pendidikan Sync: ", err));
    unsubscribers.push(unsubEdu);

    const expColRef = collection(db, 'artifacts', appId, 'public', 'data', 'experience');
    const unsubExp = onSnapshot(expColRef, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setExperience(list.length > 0 ? list : DEFAULT_EXPERIENCE);
    }, (err) => console.error("Error Pengalaman Sync: ", err));
    unsubscribers.push(unsubExp);

    const projColRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const unsubProj = onSnapshot(projColRef, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setProjects(list.length > 0 ? list : DEFAULT_PROJECTS);
    }, (err) => console.error("Error Proyek Sync: ", err));
    unsubscribers.push(unsubProj);

    const resColRef = collection(db, 'artifacts', appId, 'public', 'data', 'research');
    const unsubRes = onSnapshot(resColRef, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setResearch(list.length > 0 ? list : DEFAULT_RESEARCH);
    }, (err) => console.error("Error Riset Sync: ", err));
    unsubscribers.push(unsubRes);

    const skillsColRef = collection(db, 'artifacts', appId, 'public', 'data', 'skills');
    const unsubSkills = onSnapshot(skillsColRef, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setSkills(list.length > 0 ? list : DEFAULT_SKILLS);
    }, (err) => console.error("Error Keahlian Sync: ", err));
    unsubscribers.push(unsubSkills);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setTimeout(() => {
      if (loginPassword.trim().toLowerCase() === "katya123") {
        setIsAdmin(true);
        setShowLoginModal(false);
        setActiveTab("cms");
        triggerToast("Login Berhasil! Selamat Datang Admin.", "success");
      } else {
        triggerToast("Sandi Salah. Password tidak valid.", "error");
      }
      setIsAuthenticating(false);
    }, 600);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setActiveTab("portfolio");
    triggerToast("Berhasil keluar dari sesi Admin.", "info");
  };

  const handleSaveProfile = async (updatedProfile: any) => {
    if (isLive && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', 'main_profile');
        await setDoc(docRef, updatedProfile);
        triggerToast("Profil awan berhasil diperbarui!", "success");
      } catch (err) {
        triggerToast("Gagal menyimpan profil di database cloud.", "error");
      }
    } else {
      setProfile(updatedProfile);
      triggerToast("Profil lokal diperbarui secara dinamis!", "success");
    }
  };

  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEducation.school || !newEducation.degree) {
      triggerToast("Nama sekolah & Gelar wajib diisi.", "error");
      return;
    }
    const item = { ...newEducation, id: "edu-" + Date.now() };
    if (isLive && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'education'), newEducation);
        triggerToast("Data Pendidikan berhasil diunggah!", "success");
      } catch (e) {
        triggerToast("Gagal menyimpan di cloud.", "error");
      }
    } else {
      setEducation([...education, item]);
      triggerToast("Pendidikan lokal berhasil ditambah!", "success");
    }
    setNewEducation({ school: "", degree: "", year: "", description: "" });
  };

  const handleDeleteEducation = async (id: string) => {
    if (isLive && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'education', id));
        triggerToast("Pendidikan terhapus dari cloud!", "success");
      } catch (e) {
        triggerToast("Gagal menghapus.", "error");
      }
    } else {
      setEducation(education.filter(x => x.id !== id));
      triggerToast("Data pendidikan lokal dihapus!", "info");
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExperience.company || !newExperience.role) {
      triggerToast("Perusahaan & Jabatan wajib diisi.", "error");
      return;
    }
    const item = { ...newExperience, id: "exp-" + Date.now() };
    if (isLive && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'experience'), newExperience);
        triggerToast("Pengalaman kerja berhasil ditambah ke cloud!", "success");
      } catch (e) {
        triggerToast("Gagal mengunggah.", "error");
      }
    } else {
      setExperience([...experience, item]);
      triggerToast("Pengalaman kerja ditambahkan!", "success");
    }
    setNewExperience({ company: "", role: "", duration: "", description: "" });
  };

  const handleDeleteExperience = async (id: string) => {
    if (isLive && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'experience', id));
        triggerToast("Pengalaman berhasil dihapus!", "success");
      } catch (e) {
        triggerToast("Gagal menghapus.", "error");
      }
    } else {
      setExperience(experience.filter(x => x.id !== id));
      triggerToast("Pengalaman lokal terhapus!", "info");
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title || !newProject.description) {
      triggerToast("Judul Proyek dan Deskripsi wajib diisi.", "error");
      return;
    }
    const item = { ...newProject, id: "proj-" + Date.now() };
    if (isLive && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), newProject);
        triggerToast("Proyek baru berhasil disimpan di cloud!", "success");
      } catch (e) {
        triggerToast("Gagal mengunggah proyek.", "error");
      }
    } else {
      setProjects([...projects, item]);
      triggerToast("Proyek ditambahkan secara lokal!", "success");
    }
    setNewProject({ title: "", description: "", tech_stack: "", githubLink: "", demoLink: "", imageUrl: "" });
  };

  const handleDeleteProject = async (id: string) => {
    if (isLive && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id));
        triggerToast("Proyek terhapus dari cloud!", "success");
      } catch (e) {
        triggerToast("Gagal menghapus proyek.", "error");
      }
    } else {
      setProjects(projects.filter(x => x.id !== id));
      triggerToast("Proyek terhapus secara lokal!", "info");
    }
  };

  const handleAddResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResearch.title || !newResearch.description) {
      triggerToast("Judul riset dan deskripsi wajib diisi.", "error");
      return;
    }
    const item = { ...newResearch, id: "res-" + Date.now() };
    if (isLive && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'research'), newResearch);
        triggerToast("Riset baru berhasil diunggah ke cloud!", "success");
      } catch (e) {
        triggerToast("Gagal mengunggah riset.", "error");
      }
    } else {
      setResearch([...research, item]);
      triggerToast("Riset baru berhasil ditambahkan lokal!", "success");
    }
    setNewResearch({ title: "", description: "", imageUrl: "" });
  };

  const handleDeleteResearch = async (id: string) => {
    if (isLive && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'research', id));
        triggerToast("Riset terhapus dari cloud!", "success");
      } catch (e) {
        triggerToast("Gagal menghapus data riset.", "error");
      }
    } else {
      setResearch(research.filter(x => x.id !== id));
      triggerToast("Data riset terhapus lokal!", "info");
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.name) {
      triggerToast("Nama keahlian tidak boleh kosong.", "error");
      return;
    }
    const item = { ...newSkill, id: "sk-" + Date.now() };
    if (isLive && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'skills'), newSkill);
        triggerToast("Keahlian ditambahkan ke database!", "success");
      } catch (e) {
        triggerToast("Gagal mengunggah keahlian.", "error");
      }
    } else {
      setSkills([...skills, item]);
      triggerToast("Keahlian lokal ditambahkan!", "success");
    }
    setNewSkill({ name: "", category: "Frontend" });
  };

  const handleDeleteSkill = async (id: string) => {
    if (isLive && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'skills', id));
        triggerToast("Tag keahlian dihapus dari cloud!", "success");
      } catch (e) {
        triggerToast("Gagal menghapus keahlian.", "error");
      }
    } else {
      setSkills(skills.filter(x => x.id !== id));
      triggerToast("Tag keahlian lokal dihapus!", "info");
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white transition-colors duration-200 relative">
      
      {/* ============================================================================
          7. TOAST NOTIFIKASI GLOBAL
          ============================================================================ */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up flex items-center gap-3 bg-zinc-950 text-white px-5 py-3.5 rounded-xl shadow-xl border border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Banner Informasi Database */}
      <div className="bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-500 py-1.5 px-4 text-center flex items-center justify-center gap-2 flex-wrap">
        <span className="inline-flex items-center rounded-md bg-zinc-200 px-1.5 py-0.5 text-zinc-800 font-medium">Status Database</span>
        <span>
          {isLive 
            ? `⚡ Terkoneksi secara Live Cloud (${appId.slice(0, 8)}...)` 
            : "💾 Berjalan dalam Mode Sesi Demo Lokal. Perubahan bertahan selama halaman dibuka."
          }
        </span>
      </div>

      {/* ============================================================================
          8. NAVIGASI / NAVBAR MODERN
          ============================================================================ */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-150">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("portfolio")}>
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white font-bold text-sm">
              {profile.name ? profile.name.charAt(0) : "A"}
            </div>
            <span className="font-bold tracking-tight text-zinc-900">
              {profile.name || "Portfolio Creator"}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => { setActiveTab("portfolio"); setMobileMenuOpen(false); }}
              className={`text-sm font-medium transition-colors ${activeTab === 'portfolio' ? 'text-zinc-950 underline underline-offset-8 decoration-2' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              Halaman Portofolio
            </button>
            <button 
              onClick={() => {
                if (isAdmin) {
                  setActiveTab("cms");
                } else {
                  setShowLoginModal(true);
                }
              }}
              className={`text-sm font-medium transition-all px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'cms' 
                  ? 'bg-zinc-100 text-zinc-950 font-semibold border border-zinc-200' 
                  : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              {isAdmin ? "Dasbor CMS" : "Login Admin Panel"}
            </button>
            {isAdmin && (
              <button 
                onClick={handleAdminLogout} 
                title="Keluar Admin" 
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-red-600 hover:bg-zinc-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-2 md:hidden rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Menu Navigasi Seluler */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-100 bg-white/95 backdrop-blur-md py-4 px-6 absolute top-16 left-0 right-0 shadow-lg flex flex-col gap-3">
            <button 
              onClick={() => { setActiveTab("portfolio"); setMobileMenuOpen(false); }}
              className={`w-full text-left py-2 px-3 rounded-lg text-sm font-medium ${activeTab === 'portfolio' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-500'}`}
            >
              Halaman Portofolio Utama
            </button>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                if (isAdmin) {
                  setActiveTab("cms");
                } else {
                  setShowLoginModal(true);
                }
              }}
              className={`w-full text-left py-2 px-3 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'cms' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-500'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              {isAdmin ? "Dasbor CMS" : "Login Admin Panel"}
            </button>
            {isAdmin && (
              <button 
                onClick={() => { handleAdminLogout(); setMobileMenuOpen(false); }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Sign Out Admin
              </button>
            )}
          </div>
        )}
      </nav>

      {/* ============================================================================
          9. HALAMAN PORTOFOLIO PUBLIK
          ============================================================================ */}
      {activeTab === "portfolio" && (
        <main className="max-w-5xl mx-auto px-6 py-12 md:py-20 space-y-24">
          
          {/* Bagian 1: Hero Intro */}
          <section className="flex flex-col md:grid md:grid-cols-12 md:text-left md:items-center gap-8 pt-4 pb-8 border-b border-zinc-100">
            <div className="col-span-1 md:col-span-8 space-y-6 order-last md:order-first">
              <div className="space-y-3">
                <span className="text-sm font-bold tracking-widest text-zinc-400 uppercase">Terbuka Untuk Kerja Sama</span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                  Halo, Saya {profile.name || "Alex Morgan"}
                </h1>
                <p className="text-xl md:text-2xl font-medium text-zinc-600">
                  {profile.title || "Full-Stack Engineer"}
                </p>
              </div>
              <p className="text-base md:text-lg text-zinc-500 leading-relaxed max-w-2xl">
                {profile.bio || "Merancang produk web responsif dengan performa tinggi dan kegunaan maksimal."}
              </p>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <button 
                  onClick={triggerPrintCV}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all hover:shadow flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Cetak / Simpan CV
                </button>
                {profile.linkedin && (
                  <a 
                    href={profile.linkedin} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-all flex items-center gap-2"
                  >
                    LinkedIn
                  </a>
                )}
                {profile.github && (
                  <a 
                    href={profile.github} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-all flex items-center gap-2"
                  >
                    GitHub
                  </a>
                )}
                {profile.email && (
                  <a 
                    href={`mailto:${profile.email}`}
                    className="border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-all flex items-center gap-2"
                  >
                    Kirim Email
                  </a>
                )}
              </div>
            </div>

            <div className="md:col-span-4 order-first md:order-last flex md:justify-end">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-60 md:h-60 
        rounded-3xl overflow-hidden shadow-inner border border-zinc-200 
        bg-zinc-50 flex">

              {profile.photoUrl ? (
                <img 
                  src={profile.photoUrl} 
                  alt={profile.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; 
                    target.style.display = 'none';
                  }}
                />
              ) : (
                (SVGAvatars as any)[profile.avatarType || "tech"] || SVGAvatars.tech
              )}

            </div>
          </div>
          </section>

          {/* ============================================================================
              SISTEM TAB PROYEK VS RISET + PAGINATION (MAX 4) + ON CLICK MODAL
              ============================================================================ */}
          <section id="works-section" className="space-y-8 scroll-mt-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Karya Terbaru</h2>
              </div>

              {/* TAB SWITCHER */}
              <div className="inline-flex p-1 bg-zinc-100 rounded-xl self-start md:self-auto">
                <button
                  onClick={() => setPortfolioWorksTab("projects")}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                    portfolioWorksTab === "projects" 
                      ? "bg-white text-zinc-950 shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  💻 Proyek Aplikasi
                </button>
                <button
                  onClick={() => setPortfolioWorksTab("research")}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                    portfolioWorksTab === "research" 
                      ? "bg-white text-zinc-950 shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  🔬 Riset Ilmiah
                </button>
              </div>
            </div>

            {/* TAB CONTENT: PROYEK */}
            {portfolioWorksTab === "projects" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {paginatedProjects.map((project, index) => (
                    <div 
                      key={project.id || index}
                      onClick={() => { setSelectedWork(project); setWorkType('project'); }}
                      className="group bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full cursor-pointer"
                    >
                      {/* Project Image */}
                      <div className="relative h-48 md:h-56 w-full overflow-hidden bg-zinc-50">
                        <img 
                          src={project.imageUrl || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80"} 
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-md bg-white/90 text-zinc-900 backdrop-blur shadow-sm uppercase tracking-wider">
                            Application
                          </span>
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                        <div className="space-y-3">
                          <h3 className="text-xl font-bold text-zinc-900 group-hover:text-zinc-950 transition-colors">
                            {project.title}
                          </h3>
                          <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3">
                            {project.description}
                          </p>
                        </div>

                        <div className="space-y-4 pt-2">
                          {project.tech_stack && (
                            <div className="flex flex-wrap gap-1.5">
                              {project.tech_stack.split(',').map((tech, i) => (
                                <span 
                                  key={i} 
                                  className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-zinc-50 text-zinc-700 border border-zinc-100"
                                >
                                  {tech.trim()}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* PROJECT TAUTAN: DEMO & GITHUB */}
                          <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
                            {project.githubLink && (
                              <a 
                                href={project.githubLink} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-bold text-zinc-700 hover:text-zinc-950 transition-all flex items-center gap-1.5 bg-zinc-50 hover:bg-zinc-100 px-3 py-2 rounded-lg"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z"/>
                                </svg>
                                Repository
                              </a>
                            )}
                            {project.demoLink && (
                              <a 
                                href={project.demoLink} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all flex items-center gap-1.5 px-3 py-2 rounded-lg ml-auto"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Demo Aplikasi
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kontrol Navigasi Halaman Proyek */}
                {totalProjectPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 disabled:opacity-40 rounded-lg transition-all"
                    >
                      Sebelumnya
                    </button>
                    <span className="text-xs font-semibold text-zinc-500">
                      Halaman {currentPage} dari {totalProjectPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalProjectPages))}
                      disabled={currentPage === totalProjectPages}
                      className="px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-40 rounded-lg transition-all"
                    >
                      Selanjutnya
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: RISET (HANYA GAMBAR & DESKRIPSI) */}
            {portfolioWorksTab === "research" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {paginatedResearch.map((item, index) => (
                    <div 
                      key={item.id || index}
                      onClick={() => { setSelectedWork(item); setWorkType('research'); }}
                      className="group bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full cursor-pointer"
                    >
                      {/* Research Image (Kewajiban) */}
                      <div className="relative h-48 md:h-56 w-full overflow-hidden bg-zinc-50">
                        <img 
                          src={item.imageUrl || "https://images.unsplash.com/photo-1518152006812-edab29b069ac?auto=format&fit=crop&w=600&q=80"} 
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 shadow-sm uppercase tracking-wider border border-indigo-100">
                            Scientific Research
                          </span>
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <h3 className="text-xl font-bold text-zinc-900 group-hover:text-indigo-950 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-zinc-500 text-sm leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        {/* Info Tambahan sebagai pengganti Tombol Tautan */}
                        <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            📂 Publikasi Terbuka
                          </span>
                          <span>Peer-Reviewed</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kontrol Navigasi Halaman Riset */}
                {totalResearchPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 disabled:opacity-40 rounded-lg transition-all"
                    >
                      Sebelumnya
                    </button>
                    <span className="text-xs font-semibold text-zinc-500">
                      Halaman {currentPage} dari {totalResearchPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalResearchPages))}
                      disabled={currentPage === totalResearchPages}
                      className="px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-40 rounded-lg transition-all"
                    >
                      Selanjutnya
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Bagian 2: Pengalaman Kerja */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Pengalaman Kerja</h2>
            </div>

            <div className="relative border-l-2 border-zinc-150 pl-6 space-y-12 ml-4">
              {experience.map((item, index) => (
                <div key={item.id || index} className="relative group">
                  <span className="absolute -left-9 top-1.5 w-5 h-5 rounded-full border-4 border-white bg-zinc-900 shadow-sm group-hover:scale-125 transition-transform" />
                  
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block">
                      {item.duration}
                    </span>
                    <h3 className="text-lg font-bold text-zinc-900">
                      {item.role} <span className="text-zinc-400 font-normal">di</span> {item.company}
                    </h3>
                    <p className="text-zinc-500 leading-relaxed max-w-3xl pt-2 text-sm md:text-base">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Bagian 4: Keahlian Utama */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Keahlian & Teknologi</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {['Frontend', 'Backend', 'Tools'].map((category) => {
                const filtered = skills.filter(s => s.category?.toLowerCase() === category.toLowerCase());
                return (
                  <div key={category} className="border border-zinc-150 rounded-xl p-6 bg-zinc-50/50">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">{category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {filtered.length > 0 ? (
                        filtered.map(skill => (
                          <span 
                            key={skill.id} 
                            className="bg-white border border-zinc-200 text-zinc-800 text-sm px-3.5 py-1.5 rounded-lg font-medium shadow-sm flex items-center gap-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                            {skill.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-400 text-xs italic">Belum ada keahlian</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bagian 5: Riwayat Pendidikan */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Pendidikan</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {education.map((edu, index) => (
                <div key={edu.id || index} className="border border-zinc-200 p-6 rounded-xl space-y-3 relative overflow-hidden bg-white hover:shadow-md transition-shadow">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-zinc-400 block">{edu.year}</span>
                    <h3 className="text-lg font-bold text-zinc-900">{edu.degree}</h3>
                    <h4 className="text-sm font-semibold text-zinc-600">{edu.school}</h4>
                  </div>
                  <p className="text-zinc-500 text-sm leading-relaxed">{edu.description}</p>
                </div>
              ))}
            </div>
          </section>

        </main>
      )}

      {/* ============================================================================
          10. DASBOR ADMINISTRASI CMS
          ============================================================================ */}
      {activeTab === "cms" && isAdmin && (
        <main className="max-w-6xl mx-auto px-6 py-12">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-8 border-b border-zinc-200 mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Dasbor Admin CMS</h1>
              </div>
              <p className="text-zinc-500 text-sm mt-1">
                Ubah, tambah, dan kontrol konten portofolio Anda secara real-time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveTab("portfolio")} 
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-sm font-semibold px-4 py-2.5 rounded-lg border border-zinc-200 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Lihat Portofolio
              </button>
              <button 
                onClick={handleAdminLogout} 
                className="bg-red-50 text-red-600 hover:bg-red-100 text-sm font-semibold px-4 py-2.5 rounded-lg border border-red-200 transition-colors"
              >
                Keluar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Sidebar CMS */}
            <aside className="lg:col-span-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 p-1 bg-zinc-50 border border-zinc-200 rounded-xl">
              {[
                { id: "profile", label: "Identitas Profil", icon: "👤" },
                { id: "works", label: "Karya (Proyek & Riset)", icon: "💼" },
                { id: "experience", label: "Pengalaman Kerja", icon: "🏢" },
                { id: "skills", label: "Keahlian", icon: "⚡" },
                { id: "education", label: "Pendidikan", icon: "🎓" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCmsTab(tab.id)}
                  className={`w-full text-left whitespace-nowrap px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${
                    cmsTab === tab.id 
                      ? 'bg-zinc-900 text-white shadow-md' 
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </aside>

            {/* Panel Formulir CMS */}
            <div className="lg:col-span-9 bg-white border border-zinc-250/70 rounded-xl p-6 md:p-8 shadow-sm">
              
              {/* TAB CMS 1: EDIT PROFIL */}
              {cmsTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">Kelola Informasi Profil</h2>
                    <p className="text-xs text-zinc-400">Atur deskripsi utama diri Anda untuk publik.</p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveProfile(profile);
                    }} 
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Nama Lengkap</label>
                        <input 
                          type="text" 
                          value={profile.name} 
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Jabatan Profesional</label>
                        <input 
                          type="text" 
                          value={profile.title} 
                          onChange={(e) => setProfile({...profile, title: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Biografi Singkat</label>
                      <textarea 
                        value={profile.bio} 
                        onChange={(e) => setProfile({...profile, bio: e.target.value})}
                        rows={3}
                        className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Lokasi</label>
                        <input 
                          type="text" 
                          value={profile.location || ""} 
                          onChange={(e) => setProfile({...profile, location: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Tautan LinkedIn</label>
                        <input 
                          type="url" 
                          value={profile.linkedin} 
                          onChange={(e) => setProfile({...profile, linkedin: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Tautan GitHub</label>
                        <input 
                          type="url" 
                          value={profile.github} 
                          onChange={(e) => setProfile({...profile, github: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Alamat Email</label>
                        <input 
                          type="email" 
                          value={profile.email} 
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Pilihan Avatar Default</label>
                        <select 
                          value={profile.avatarType} 
                          onChange={(e) => setProfile({...profile, avatarType: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3.5 py-2 text-sm focus:outline-none"
                        >
                          <option value="tech">Developer Gray Scale Vector</option>
                          <option value="design">Design Abstract Violet</option>
                          <option value="minimal">Minimal Line Silhouette</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-2"
                    >
                      Simpan Perubahan Profil
                    </button>
                  </form>
                </div>
              )}

              {/* TAB CMS 2: KELOLA KARYA (PROYEK & RISET) */}
              {cmsTab === "works" && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900">Kelola Hasil Karya</h2>
                      <p className="text-xs text-zinc-400">Pilih tab di bawah untuk mengelola Proyek atau Riset secara terpisah.</p>
                    </div>

                    {/* Sub-tab manajemen di CMS */}
                    <div className="inline-flex p-1 bg-zinc-100 rounded-lg">
                      <button
                        onClick={() => setCmsWorksSubTab("projects")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                          cmsWorksSubTab === "projects" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
                        }`}
                      >
                        Proyek Aplikasi
                      </button>
                      <button
                        onClick={() => setCmsWorksSubTab("research")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                          cmsWorksSubTab === "research" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
                        }`}
                      >
                        Riset Ilmiah
                      </button>
                    </div>
                  </div>

                  {/* KONTEN KELOLA PROYEK */}
                  {cmsWorksSubTab === "projects" && (
                    <div className="space-y-6">
                      {/* Form Tambah Proyek */}
                      <form onSubmit={handleAddProject} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50 space-y-4">
                        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">➕ Tambah Proyek Baru</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Judul Proyek</label>
                            <input 
                              type="text" 
                              value={newProject.title} 
                              onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                              placeholder="Contoh: Zenith Task Manager" 
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Tautan Gambar (URL Gambar)</label>
                            <input 
                              type="text" 
                              value={newProject.imageUrl} 
                              onChange={(e) => setNewProject({...newProject, imageUrl: e.target.value})}
                              placeholder="https://images.unsplash.com/..." 
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Tautan GitHub (Repository)</label>
                            <input 
                              type="url" 
                              value={newProject.githubLink} 
                              onChange={(e) => setNewProject({...newProject, githubLink: e.target.value})}
                              placeholder="https://github.com/username/project" 
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Tautan Live Demo</label>
                            <input 
                              type="url" 
                              value={newProject.demoLink} 
                              onChange={(e) => setNewProject({...newProject, demoLink: e.target.value})}
                              placeholder="https://project-demo.com" 
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500">Kumpulan Teknologi (pisahkan dengan koma)</label>
                          <input 
                            type="text" 
                            value={newProject.tech_stack} 
                            onChange={(e) => setNewProject({...newProject, tech_stack: e.target.value})}
                            placeholder="React, Tailwind, Node.js" 
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500">Deskripsi Ringkas</label>
                          <textarea 
                            value={newProject.description} 
                            onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                            placeholder="Tuliskan penjelasan mengenai cara kerja dan keunggulan proyek..." 
                            rows={2}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          />
                        </div>

                        <button 
                          type="submit" 
                          className="bg-zinc-950 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          Publikasikan Proyek
                        </button>
                      </form>

                      {/* List Proyek yang Aktif */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Daftar Proyek Aktif</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {projects.map(proj => (
                            <div key={proj.id} className="p-4 border border-zinc-150 rounded-xl bg-white flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex items-center gap-3">
                                    {proj.imageUrl && (
                                      <img src={proj.imageUrl} className="w-10 h-10 object-cover rounded-lg border" alt="preview" />
                                    )}
                                    <h4 className="font-bold text-zinc-900 text-sm leading-tight">{proj.title}</h4>
                                  </div>
                                  <button 
                                    onClick={() => handleDeleteProject(proj.id)}
                                    className="p-1 rounded text-red-500 hover:bg-red-50 transition-all"
                                    title="Hapus Proyek"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                <p className="text-zinc-500 text-xs line-clamp-2">{proj.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KONTEN KELOLA RISET */}
                  {cmsWorksSubTab === "research" && (
                    <div className="space-y-6">
                      {/* Form Tambah Riset */}
                      <form onSubmit={handleAddResearch} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50 space-y-4">
                        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">➕ Tambah Hasil Riset Baru</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Judul Riset / Jurnal</label>
                            <input 
                              type="text" 
                              value={newResearch.title} 
                              onChange={(e) => setNewResearch({...newResearch, title: e.target.value})}
                              placeholder="Contoh: Analisis Kinerja CPU Pada Rendering UI" 
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Tautan Gambar Riset (Ilustrasi Teknis)</label>
                            <input 
                              type="text" 
                              value={newResearch.imageUrl} 
                              onChange={(e) => setNewResearch({...newResearch, imageUrl: e.target.value})}
                              placeholder="https://images.unsplash.com/..." 
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500">Abstrak / Deskripsi Hasil Riset</label>
                          <textarea 
                            value={newResearch.description} 
                            onChange={(e) => setNewResearch({...newResearch, description: e.target.value})}
                            placeholder="Uraikan temuan riset, metodologi kompresi data, serta kesimpulan praktis yang didapat..." 
                            rows={3}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          />
                        </div>

                        <button 
                          type="submit" 
                          className="bg-zinc-950 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          Publikasikan Riset
                        </button>
                      </form>

                      {/* List Riset yang Aktif */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Daftar Jurnal Riset Aktif</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {research.map(res => (
                            <div key={res.id} className="p-4 border border-zinc-150 rounded-xl bg-white flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex items-center gap-3">
                                    {res.imageUrl && (
                                      <img src={res.imageUrl} className="w-10 h-10 object-cover rounded-lg border" alt="research preview" />
                                    )}
                                    <h4 className="font-bold text-zinc-900 text-sm leading-tight">{res.title}</h4>
                                  </div>
                                  <button 
                                    onClick={() => handleDeleteResearch(res.id)}
                                    className="p-1 rounded text-red-500 hover:bg-red-50 transition-all"
                                    title="Hapus Riset"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                <p className="text-zinc-500 text-xs line-clamp-2">{res.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB CMS 3: PENGALAMAN KERJA */}
              {cmsTab === "experience" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">Kelola Karir Profesional</h2>
                    <p className="text-xs text-zinc-400">Tambahkan atau hapus riwayat instansi tempat Anda berkontribusi.</p>
                  </div>

                  <form onSubmit={handleAddExperience} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50 space-y-4">
                    <h3 className="text-xs font-bold text-zinc-600 uppercase">➕ Tambah Pengalaman</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Nama Perusahaan</label>
                        <input 
                          type="text" 
                          value={newExperience.company} 
                          onChange={(e) => setNewExperience({...newExperience, company: e.target.value})}
                          placeholder="Stripe, Gojek, Tokopedia" 
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Jabatan Pekerjaan</label>
                        <input 
                          type="text" 
                          value={newExperience.role} 
                          onChange={(e) => setNewExperience({...newExperience, role: e.target.value})}
                          placeholder="Senior Developer" 
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Rentang Waktu</label>
                        <input 
                          type="text" 
                          value={newExperience.duration} 
                          onChange={(e) => setNewExperience({...newExperience, duration: e.target.value})}
                          placeholder="2022 - Sekarang" 
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500">Tanggung Jawab Karir</label>
                      <textarea 
                        value={newExperience.description} 
                        onChange={(e) => setNewExperience({...newExperience, description: e.target.value})}
                        placeholder="Uraikan pencapaian utama dan tumpukan teknologi kerja Anda..." 
                        rows={3}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="bg-zinc-950 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Tambahkan Pengalaman
                    </button>
                  </form>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Daftar Pengalaman Karir</h3>
                    <div className="divide-y divide-zinc-150">
                      {experience.map(item => (
                        <div key={item.id} className="py-4 flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-zinc-900">{item.role} <span className="text-zinc-400 font-normal">di</span> {item.company}</h4>
                            <p className="text-xs text-zinc-400 font-bold">{item.duration}</p>
                            <p className="text-xs text-zinc-600 line-clamp-2">{item.description}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteExperience(item.id)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CMS 4: KEAHLIAN */}
              {cmsTab === "skills" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">Kelola Matriks Keahlian</h2>
                    <p className="text-xs text-zinc-400">Klasifikasikan kemampuan Anda ke dalam kategori frontend, backend, atau peralatan.</p>
                  </div>

                  <form onSubmit={handleAddSkill} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50 flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold text-zinc-500">Nama Keahlian</label>
                      <input 
                        type="text" 
                        value={newSkill.name} 
                        onChange={(e) => setNewSkill({...newSkill, name: e.target.value})}
                        placeholder="Contoh: NextJS" 
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500">Kategori Klasifikasi</label>
                      <select 
                        value={newSkill.category} 
                        onChange={(e) => setNewSkill({...newSkill, category: e.target.value})}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      >
                        <option value="Frontend">Frontend</option>
                        <option value="Backend">Backend</option>
                        <option value="Tools">Tools</option>
                      </select>
                    </div>
                    <button 
                      type="submit" 
                      className="bg-zinc-950 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Tambahkan Tag
                    </button>
                  </form>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Frontend', 'Backend', 'Tools'].map(category => {
                      const filtered = skills.filter(s => s.category?.toLowerCase() === category.toLowerCase());
                      return (
                        <div key={category} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50/50 space-y-3">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{category}</h4>
                          <div className="flex flex-col gap-1.5">
                            {filtered.map(item => (
                              <div key={item.id} className="bg-white px-3 py-1.5 rounded-lg border border-zinc-200 flex items-center justify-between shadow-sm">
                                <span className="text-xs font-medium text-zinc-800">{item.name}</span>
                                <button 
                                  onClick={() => handleDeleteSkill(item.id)}
                                  className="text-red-400 hover:text-red-600 p-0.5"
                                  title="Hapus Keahlian"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB CMS 5: RIWAYAT PENDIDIKAN */}
              {cmsTab === "education" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">Kelola Pendidikan Akademis</h2>
                    <p className="text-xs text-zinc-400">Atur latar belakang riwayat studi akademis Anda.</p>
                  </div>

                  <form onSubmit={handleAddEducation} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50 space-y-4">
                    <h3 className="text-xs font-bold text-zinc-600 uppercase">➕ Tambah Pendidikan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Nama Universitas / Sekolah</label>
                        <input 
                          type="text" 
                          value={newEducation.school} 
                          onChange={(e) => setNewEducation({...newEducation, school: e.target.value})}
                          placeholder="Universitas Indonesia" 
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Gelar Pendidikan</label>
                        <input 
                          type="text" 
                          value={newEducation.degree} 
                          onChange={(e) => setNewEducation({...newEducation, degree: e.target.value})}
                          placeholder="S1 Teknik Informatika" 
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Tahun Angkatan</label>
                        <input 
                          type="text" 
                          value={newEducation.year} 
                          onChange={(e) => setNewEducation({...newEducation, year: e.target.value})}
                          placeholder="2018 - 2022" 
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500">Penjelasan Tambahan</label>
                      <textarea 
                        value={newEducation.description} 
                        onChange={(e) => setNewEducation({...newEducation, description: e.target.value})}
                        placeholder="IPK, fokus riset skripsi, atau kegiatan organisasi kemahasiswaan..." 
                        rows={2}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="bg-zinc-950 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Simpan Pendidikan
                    </button>
                  </form>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pendidikan yang Ditampilkan</h3>
                    <div className="divide-y divide-zinc-150">
                      {education.map(edu => (
                        <div key={edu.id} className="py-4 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-zinc-900">{edu.degree}</h4>
                            <p className="text-xs text-zinc-500 font-semibold">{edu.school} — {edu.year}</p>
                            <p className="text-xs text-zinc-600 line-clamp-2">{edu.description}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteEducation(edu.id)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </main>
      )}

      {/* ============================================================================
          10.5. MODAL DETAIL KARYA (POP-UP)
          ============================================================================ */}
      {selectedWork && (
        <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col">
            
            {/* Tombol Tutup Modal */}
            <button 
              onClick={() => { setSelectedWork(null); setWorkType(null); }}
              className="absolute top-4 right-4 z-10 bg-white/50 backdrop-blur-md border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-white p-2 rounded-full transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Gambar Utama Modal */}
            <div className="w-full h-64 md:h-80 bg-zinc-100 relative shrink-0">
              <img 
                src={selectedWork.imageUrl || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80"} 
                alt={selectedWork.title} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-900/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-md mb-3 shadow-sm uppercase tracking-wider ${workType === 'project' ? 'bg-white/90 text-zinc-900' : 'bg-indigo-500 text-white'}`}>
                  {workType === 'project' ? 'Application Project' : 'Scientific Research'}
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">{selectedWork.title}</h2>
              </div>
            </div>

            {/* Konten Scrollable */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Deskripsi Lengkap</h3>
                <p className="text-zinc-600 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                  {selectedWork.description}
                </p>
              </div>

              {workType === 'project' && selectedWork.tech_stack && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Teknologi yang Digunakan</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedWork.tech_stack.split(',').map((tech, i) => (
                      <span key={i} className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tombol Aksi Modal */}
              {workType === 'project' && (selectedWork.githubLink || selectedWork.demoLink) && (
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-100">
                  {selectedWork.githubLink && (
                    <a href={selectedWork.githubLink} target="_blank" rel="noreferrer" className="flex-1 md:flex-none justify-center text-sm font-bold text-zinc-700 hover:text-zinc-950 transition-all flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-5 py-3 rounded-xl">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z"/></svg>
                      Lihat Repository
                    </a>
                  )}
                  {selectedWork.demoLink && (
                    <a href={selectedWork.demoLink} target="_blank" rel="noreferrer" className="flex-1 md:flex-none justify-center text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all flex items-center gap-2 px-5 py-3 rounded-xl shadow-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      Kunjungi Demo
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          11. DIALOG LOGIN ADMIN SECURE
          ============================================================================ */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-sm w-full p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 font-bold mx-auto flex items-center justify-center text-lg shadow-sm border border-zinc-200">
                🗝️
              </div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Gerbang CMS Admin</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Gunakan sandi admin untuk menambah atau mengedit matriks konten portofolio Anda.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Sandi Akses Admin</label>
                <input 
                  type="password" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Isi sandi..." 
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none transition-all font-mono"
                />
                <p className="text-[10px] text-zinc-400 italic pt-1 text-center">
                  Bypass demo diaktifkan secara default. Klik "Verifikasi Sandi" langsung.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isAuthenticating}
                className="w-full bg-zinc-950 hover:bg-zinc-850 text-white font-semibold text-sm py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isAuthenticating ? (
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-white animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Verifikasi Sandi
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================
          12. MINIMAL FOOTER
          ============================================================================ */}
      <footer className="border-t border-zinc-150 py-12 bg-zinc-50/50 mt-20">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="font-bold text-zinc-900 tracking-tight text-sm">
              {profile.name || "Alex Morgan"} — Portfolio Studio
            </h3>
            <p className="text-xs text-zinc-400">
              Dibuat dengan detail arsitektur modern dan rendering tanpa latensi.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-zinc-400">
            <span>© 2026. Hak Cipta Dilindungi.</span>
            <span className="text-zinc-300">|</span>
            <button 
              onClick={() => {
                if (isAdmin) {
                  setActiveTab("cms");
                } else {
                  setShowLoginModal(true);
                }
              }}
              className="hover:text-zinc-900 transition-colors"
            >
              Sistem Manajemen Portal
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}