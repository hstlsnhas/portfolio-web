import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  console.warn("Firebase initialization skipped. Running in standalone demo mode.", error);
}

const EMPTY_PROFILE = {
  name: "",
  title: "",
  bio: "",
  photoUrl: "",
  cvUrl: "",
  linkedin: "",
  github: "",
  email: "",
  location: ""
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [cmsTab, setCmsTab] = useState<"profile" | "works" | "experience" | "skills" | "education">("profile");
  const [portfolioWorksTab, setPortfolioWorksTab] = useState("projects"); // 'projects' | 'research'
  const [cmsWorksSubTab, setCmsWorksSubTab] = useState("projects");

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [education, setEducation] = useState<any[]>([]);
  const [experience, setExperience] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [research, setResearch] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);

  const [isLive, setIsLive] = useState(false);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const [introAnimated, setIntroAnimated] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDataLoading, setisDataLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [portfolioSectionTab, setPortfolioSectionTab] = useState<"about" | "projects" | "work" | "skills" | "education">("about");
  const [projectSortOrder, setProjectSortOrder] = useState<"asc" | "desc">("asc");
  const ITEMS_PER_PAGE = 4;

  const [newSkill, setNewSkill] = useState({ name: "", category: "Data Analyst" });
  const [newProject, setNewProject] = useState({ title: "", description: "", tech_stack: "", githubLink: "", demoLink: "", imageUrl: "", gallery: [] as string[] });
  const [newProjectGalleryUrl, setNewProjectGalleryUrl] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const addProjectGalleryImage = () => {
    const value = newProjectGalleryUrl.trim();
    if (!value) return;
    setNewProject((prev) => ({
      ...prev,
      gallery: [...(Array.isArray(prev.gallery) ? prev.gallery : []), value],
    }));
    setNewProjectGalleryUrl("");
    triggerToast("Gallery image added.", "success");
  };
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null);
  const [editingResearchId, setEditingResearchId] = useState<string | null>(null);
  const [newResearch, setNewResearch] = useState({ title: "", description: "", imageUrl: "" });
  const [newExperience, setNewExperience] = useState({ company: "", role: "", duration: "", description: "" });
  const [newEducation, setNewEducation] = useState({ school: "", degree: "", year: "", description: "" });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    hero: true,
    works: true,
    experience: true,
    skills: true,
    education: true,
  });
  const [heroMotion, setHeroMotion] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({
    profilePhoto: false,
    cv: false,
    project: false,
    research: false,
    projectGallery: false,
  });
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({
    profilePhoto: 0,
    cv: 0,
    project: 0,
    research: 0,
    projectGallery: 0,
  });
  const [hoveredWorkId, setHoveredWorkId] = useState<string | null>(null);
  const [activeExperienceId, setActiveExperienceId] = useState<string | null>(null);
  const [hoveredSkillCategory, setHoveredSkillCategory] = useState<string | null>(null);
  const [hoveredEducationId, setHoveredEducationId] = useState<string | null>(null);

  // State untuk menampung data karya yang sedang dipilih untuk pop-up modal
  const [selectedWork, setSelectedWork] = useState<any>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const projectFormRef = useRef<HTMLFormElement | null>(null);
  const researchFormRef = useRef<HTMLFormElement | null>(null);
  const [workType, setWorkType] = useState<string | null>(null); // 'project' | 'research'

  const cmsTabs: { id: "profile" | "works" | "experience" | "skills" | "education"; label: string; icon: string }[] = [
    { id: "profile", label: "Profile Information", icon: "👤" },
    { id: "works", label: "Works (Projects & Research)", icon: "💼" },
    { id: "experience", label: "Work Experience", icon: "🏢" },
    { id: "skills", label: "Skills", icon: "⚡" },
    { id: "education", label: "Education", icon: "🎓" }
  ];

  const downloadCV = () => {
    if (profile.cvUrl) {
      if (profile.cvUrl.startsWith('data:')) {
        // Base64 data URL — trigger download directly
        const link = document.createElement('a');
        link.href = profile.cvUrl;
        const ext = profile.cvUrl.startsWith('data:application/pdf') ? 'pdf'
          : profile.cvUrl.startsWith('data:application/vnd') ? 'docx'
          : 'doc';
        link.download = `${profile.name || 'CV'}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Normal URL — open in new tab
        window.open(profile.cvUrl, '_blank', 'noreferrer');
      }
    } else {
      // No CV uploaded — fallback to print
      window.print();
    }
  };

  // Reset pagination ke halaman 1 setiap kali tab portofolio dirubah
  useEffect(() => {
    setCurrentPage(1);
  }, [portfolioWorksTab]);

  const sectionMotionClass = (key: string) => {
    return `transition-all duration-700 ease-out ${visibleSections[key] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`;
  };

  const sectionToTabMap: Record<string, "about" | "projects" | "work" | "skills" | "education"> = {
    hero: 'about',
    works: 'projects',
    experience: 'work',
    skills: 'skills',
    education: 'education',
  };

  const scrollToPortfolioSection = (tabId: "about" | "projects" | "work" | "skills" | "education", sectionId: string) => {
    setPortfolioSectionTab(tabId);
    const section = document.querySelector(`section[data-animate-section='${sectionId}']`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (!editingProjectId || !projectFormRef.current) return;
    projectFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editingProjectId]);

  useEffect(() => {
    if (!editingResearchId || !researchFormRef.current) return;
    researchFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editingResearchId]);

  // Set project page and scroll to top of the Projects section
  const setProjectPageAndScroll = (newPage: number) => {
    const clamped = Math.max(1, Math.min(newPage, totalProjectPages || 1));
    setCurrentPage(clamped);
    // ensure scroll happens after state update / layout
    setTimeout(() => scrollToPortfolioSection('projects', 'works'), 80);
  };

  // Animate intro text when initial spinner finishes
  useEffect(() => {
    if (!isAppInitializing) {
      const id = setTimeout(() => setIntroAnimated(true), 120);
      return () => clearTimeout(id);
    }
    setIntroAnimated(false);
  }, [isAppInitializing]);

  useEffect(() => {
    const sections = document.querySelectorAll('section[data-animate-section]');
    if (!sections.length) return;

    /*
    const intersectionRatios: Record<string, number> = {};
    const updateActiveSection = () => {
      let maxRatio = 0;
      let activeSectionId: string | null = null;
      for (const[sectionId, ratio] of Object.entries(intersectionRatios)) {
        if (ratio > maxRatio) {
          maxRatio = ratio;
          activeSectionId = sectionId;
        }
      }
      if (activeSectionId && sectionToTabMap[activeSectionId]) {
        setPortfolioSectionTab(sectionToTabMap[activeSectionId]);
      }
    };
    */

    // Observer 1
    const animObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const sectionId = entry.target.getAttribute('data-animate-section');
        if (!sectionId) return;
        if (entry.isIntersecting) {
          setVisibleSections((prev) => ({...prev, [sectionId]: true }));
        }
      });
    }, {
      rootMargin: '-10% 0px -10% 0px',
      threshold: 0
    });

    // Observer 2
    const updateActiveNav = () => {
      const liveSections = document.querySelectorAll('section[data-animate-section]');
      const navOffset = window.innerHeight * 0.35;
      let closestSection: string | null = null;
      let closestDist = Infinity;
 
      liveSections.forEach((section) => {
        const sectionId = section.getAttribute('data-animate-section');
        if (!sectionId || !(sectionToTabMap as Record<string, string>)[sectionId]) return;
        const rect = section.getBoundingClientRect();
        const dist = Math.abs(rect.top - navOffset);
        // Only consider sections whose top has entered the upper portion of the screen
        if (rect.top <= navOffset + 100 && dist < closestDist) {
          closestDist = dist;
          closestSection = sectionId;
        }
      });
 
      if (closestSection && (sectionToTabMap as Record<string, string>)[closestSection]) {
        setPortfolioSectionTab((sectionToTabMap as Record<string, "about" | "projects" | "work" | "skills" | "education">)[closestSection]);
      }
    };
 
    const navObserver = new IntersectionObserver(() => {
      updateActiveNav();
    }, {
      rootMargin: '0px 0px -20% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    });

    window.addEventListener('scroll', updateActiveNav, { passive: true });
 
    sections.forEach((section) => {
      animObserver.observe(section);
      navObserver.observe(section);
    });
 
    return () => {
      animObserver.disconnect();
      navObserver.disconnect();
      window.removeEventListener('scroll', updateActiveNav);
    };
  }, [isAppInitializing, isDataLoading]);
  
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return projectSortOrder === 'asc'
        ? titleA.localeCompare(titleB)
        : titleB.localeCompare(titleA);
    });
  }, [projects, projectSortOrder]);

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedProjects.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedProjects, currentPage]);

  const totalProjectPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedProjects.length / ITEMS_PER_PAGE));
  }, [sortedProjects]);

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
      console.log("Firebase not detected. Running in local mode.");
      setIsAppInitializing(false);
      return;
    }

    let authReady = false;
    const initAuthAndSync = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (authError) {
        console.error("Failed to authenticate: ", authError);
      }
    };

    initAuthAndSync();

    const timeoutId = window.setTimeout(() => {
      if (!authReady) {
        authReady = true;
        setIsAppInitializing(false);
        triggerToast("Firebase is taking longer than usual. Loading local view.", "warning");
      }
    }, 8000);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!authReady) {
        authReady = true;
        setIsAppInitializing(false);
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        setIsLive(true);
        triggerToast("Connected to Cloud Database Sync", "success");
      } else {
        setUser(null);
        setIsLive(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribeAuth();
    };
  }, []);

  /*
  useEffect(() => {
    if (!isLive) {
      setProfile(EMPTY_PROFILE);
      setEducation([]);
      setExperience([]);
      setProjects([]);
      setResearch([]);
      setSkills([]);
    }
  }, [isLive]);
  */

  useEffect(() => {
    if (!isFirebaseAvailable) {
      setisDataLoading(false);
      return;
    }

    if (!user) return;

    let loadedCount = 0;
    const TOTAL_SOURCES = 6;

    const markLoaded = () => {
      loadedCount++;
      if (loadedCount >= TOTAL_SOURCES) {
        setisDataLoading(false);
      }
    };

    const unsubscribers: Array<() => void> = [];

    const profileDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', 'main_profile');
    const unsubProfile = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as typeof EMPTY_PROFILE);
      } else {
        setProfile(EMPTY_PROFILE);
      }
      markLoaded();
    }, (err) => { console.error("Error Profil Sync: ", err); markLoaded(); });
    unsubscribers.push(unsubProfile);

    const eduColRef = collection(db, 'artifacts', appId, 'public', 'data', 'education');
    const unsubEdu = onSnapshot(eduColRef, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setEducation(list);
      markLoaded();
    }, (err) => { console.error("Error Pendidikan Sync: ", err); markLoaded(); });
    unsubscribers.push(unsubEdu);

    const expColRef = collection(db, 'artifacts', appId, 'public', 'data', 'experience');
    const unsubExp = onSnapshot(expColRef, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setExperience(list);
      markLoaded();
    }, (err) => { console.error("Error Pengalaman Sync: ", err); markLoaded(); });
    unsubscribers.push(unsubExp);

    const projColRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const unsubProj = onSnapshot(projColRef, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setProjects(list);
      markLoaded();
    }, (err) => { console.error("Error Proyek Sync: ", err); markLoaded(); });
    unsubscribers.push(unsubProj);

    const resColRef = collection(db, 'artifacts', appId, 'public', 'data', 'research');
    const unsubRes = onSnapshot(resColRef, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setResearch(list);
      markLoaded();
    }, (err) => { console.error("Error Riset Sync: ", err); markLoaded(); });
    unsubscribers.push(unsubRes);

    const skillsColRef = collection(db, 'artifacts', appId, 'public', 'data', 'skills');
    const unsubSkills = onSnapshot(skillsColRef, (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setSkills(list);
      markLoaded();
    }, (err) => { console.error("Error Keahlian Sync: ", err); markLoaded(); });
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
        triggerToast("Login Successful! Welcome Admin.", "success");
      } else {
        triggerToast("Incorrect Password. Please try again.", "error");
      }
      setIsAuthenticating(false);
    }, 600);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setActiveTab("portfolio");
    triggerToast("Successfully logged out of Admin session.", "info");
  };

  const handleSaveProfile = async (updatedProfile: any) => {
    if (isLive && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', 'main_profile');
        await setDoc(docRef, updatedProfile);
        triggerToast("Profile updated successfully!", "success");
      } catch (err) {
        triggerToast("Failed to save profile to cloud database.", "error");
      }
    } else {
      setProfile(updatedProfile);
      triggerToast("Local profile updated successfully!", "success");
    }
  };

  const compressImage = (file: File, maxWidth = 1200): Promise<File | Blob> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                } else {
                  resolve(file);
                }
              },
              'image/jpeg',
              0.7
            );
          } else {
            resolve(file);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'profilePhoto' | 'cv' | 'project' | 'research' | 'projectGallery'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(prev => ({ ...prev, [type]: true }));
    setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    triggerToast(`Processing ${file.name}...`, "info");

    try {
      // Compress if it is an image
      let fileToUpload: File | Blob = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }

      setUploadProgress(prev => ({ ...prev, [type]: 50 }));

      // Convert fileToUpload to Base64 string
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      reader.readAsDataURL(fileToUpload);
      const base64String = await base64Promise;
      setUploadProgress(prev => ({ ...prev, [type]: 100 }));

      // Update state berdasarkan tipe
      if (type === 'profilePhoto') {
        setProfile(prev => ({ ...prev, photoUrl: base64String }));
      } else if (type === 'cv') {
        setProfile(prev => ({ ...prev, cvUrl: base64String }));
      } else if (type === 'project') {
        setNewProject(prev => ({ ...prev, imageUrl: base64String }));
      } else if (type === 'projectGallery') {
        setNewProject(prev => ({
          ...prev,
          gallery: [...(Array.isArray(prev.gallery) ? prev.gallery : []), base64String],
        }));
      } else if (type === 'research') {
        setNewResearch(prev => ({ ...prev, imageUrl: base64String }));
      }

      triggerToast("File uploaded successfully!", "success");
    } catch (error: any) {
      console.error("Upload error:", error);
      triggerToast(`Failed to upload file: ${error.message || error}`, "error");
    } finally {
      setIsUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleSaveEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEducation.school || !newEducation.degree) {
      triggerToast("School name & Degree are required.", "error");
      return;
    }
    const updatedData = { ...newEducation };
    if (editingEducationId) {
      if (isLive && db) {
        try {
          await handleUpdateEducation(editingEducationId, updatedData);
          triggerToast("Education data updated successfully!", "success");
        } catch (e: any) {
          console.error("Failed to update education:", e);
          triggerToast(`Failed to update education. ${e?.message || "Please try again."}`, "error");
        }
      } else {
        setEducation(education.map((edu) => edu.id === editingEducationId ? { ...edu, ...updatedData } : edu));
        triggerToast("Education data updated locally!", "success");
      }
      setEditingEducationId(null);
      setNewEducation({ school: "", degree: "", year: "", description: "" });
      return;
    }

    const item = { ...newEducation, id: "edu-" + Date.now() };
    if (isLive && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'education'), newEducation);
        triggerToast("Education data uploaded successfully!", "success");
      } catch (e) {
        triggerToast("Failed to save to cloud.", "error");
      }
    } else {
      setEducation([...education, item]);
      triggerToast("Local education data added successfully!", "success");
    }
    setNewEducation({ school: "", degree: "", year: "", description: "" });
  };

  const handleDeleteEducation = async (id: string) => {
    if (isLive && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'education', id));
        triggerToast("Education data removed from cloud!", "success");
      } catch (e) {
        triggerToast("Failed to delete education data.", "error");
      }
    } else {
      setEducation(education.filter(x => x.id !== id));
      triggerToast("Local education data deleted!", "info");
    }
  };

  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExperience.company || !newExperience.role) {
      triggerToast("Company & Role are required.", "error");
      return;
    }
    const updatedData = { ...newExperience };
    if (editingExperienceId) {
      if (isLive && db) {
        try {
          await handleUpdateExperience(editingExperienceId, updatedData);
          triggerToast("Work experience updated successfully!", "success");
        } catch (e: any) {
          console.error("Failed to update experience:", e);
          triggerToast(`Failed to update experience. ${e?.message || "Please try again."}`, "error");
        }
      } else {
        setExperience(experience.map((exp) => exp.id === editingExperienceId ? { ...exp, ...updatedData } : exp));
        triggerToast("Work experience updated locally!", "success");
      }
      setEditingExperienceId(null);
      setNewExperience({ company: "", role: "", duration: "", description: "" });
      return;
    }

    const item = { ...newExperience, id: "exp-" + Date.now() };
    if (isLive && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'experience'), newExperience);
        triggerToast("Work experience successfully added to cloud!", "success");
      } catch (e) {
        triggerToast("Failed to upload work experience.", "error");
      }
    } else {
      setExperience([...experience, item]);
      triggerToast("Work experience added locally!", "success");
    }
    setNewExperience({ company: "", role: "", duration: "", description: "" });
  };

  const handleDeleteExperience = async (id: string) => {
    if (isLive && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'experience', id));
        triggerToast("Work experience successfully deleted!", "success");
      } catch (e) {
        triggerToast("Failed to delete work experience.", "error");
      }
    } else {
      setExperience(experience.filter(x => x.id !== id));
      triggerToast("Local work experience deleted!", "info");
    }
  };

  const resetProjectForm = () => {
    setEditingProjectId(null);
    setNewProject({ title: "", description: "", tech_stack: "", githubLink: "", demoLink: "", imageUrl: "", gallery: [] });
    setNewProjectGalleryUrl("");
  };

  const startEditProject = (project: any) => {
    setEditingProjectId(project.id);
    setNewProject({
      title: project.title || "",
      description: project.description || "",
      tech_stack: project.tech_stack || "",
      githubLink: project.githubLink || "",
      demoLink: project.demoLink || "",
      imageUrl: project.imageUrl || "",
      gallery: project.gallery || [],
    });
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title || !newProject.description) {
      triggerToast("Project title and description are required.", "error");
      return;
    }

    if (editingProjectId) {
      const updatedData = { ...newProject };
      if (isLive && db) {
        try {
          await handleUpdateProject(editingProjectId, updatedData);
          triggerToast("Project updated successfully!", "success");
        } catch (e: any) {
          console.error("Failed to update project:", e);
          triggerToast(`Failed to update project. ${e?.message || "Please try again."}`, "error");
        }
      } else {
        setProjects(projects.map((proj) => proj.id === editingProjectId ? { ...proj, ...updatedData } : proj));
        triggerToast("Project updated locally!", "success");
      }
      resetProjectForm();
      return;
    }

    const item = { ...newProject, id: "proj-" + Date.now() };
    if (isLive && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), newProject);
        triggerToast("Project added to cloud successfully!", "success");
      } catch (e) {
        triggerToast("Failed to upload project.", "error");
      }
    } else {
      setProjects([...projects, item]);
      triggerToast("Project added locally!", "success");
    }
    resetProjectForm();
  };

  const handleDeleteProject = async (id: string) => {
    if (isLive && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id));
        triggerToast("Project removed from cloud!", "success");
      } catch (e) {
        triggerToast("Failed to delete project.", "error");
      }
    } else {
      setProjects(projects.filter(x => x.id !== id));
      triggerToast("Project deleted locally!", "info");
    }
  };

  const handleUpdateProject = async (id: string, updatedData: any) => {
    if (!db) {
      throw new Error("Firestore database is not available.");
    }
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'projects', id);
    await setDoc(ref, updatedData, { merge: true });
  };

  const handleUpdateExperience = async (id: string, updatedData: any) => {
    if (!db) {
      throw new Error("Firestore database is not available.");
    }
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'experience', id);
    await setDoc(ref, updatedData, { merge: true });
  };

  const handleUpdateSkill = async (id: string, updatedData: any) => {
    if (!db) {
      throw new Error("Firestore database is not available.");
    }
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'skills', id);
    await setDoc(ref, updatedData, { merge: true });
  };

  const handleUpdateEducation = async (id: string, updatedData: any) => {
    if (!db) {
      throw new Error("Firestore database is not available.");
    }
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'education', id);
    await setDoc(ref, updatedData, { merge: true });
  };

  const handleUpdateResearch = async (id: string, updatedData: any) => {
    if (!db) {
      throw new Error("Firestore database is not available.");
    }
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'research', id);
    await setDoc(ref, updatedData, { merge: true });
  };

  const resetResearchForm = () => {
    setNewResearch({ title: "", description: "", imageUrl: "" });
    setEditingResearchId(null);
  };

  const startEditResearch = (item: any) => {
    setEditingResearchId(item.id);
    setNewResearch({
      title: item.title || "",
      description: item.description || "",
      imageUrl: item.imageUrl || ""
    });
  };

  const handleAddResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResearch.title || !newResearch.description) {
      triggerToast("Research title and description are required.", "error");
      return;
    }

    const updatedData = { ...newResearch };
    if (editingResearchId) {
      if (isLive && db) {
        try {
          await handleUpdateResearch(editingResearchId, updatedData);
          triggerToast("Research updated successfully!", "success");
        } catch (e: any) {
          triggerToast(`Failed to update research. ${e?.message || "Please try again."}`, "error");
        }
      } else {
        setResearch(research.map((res) => res.id === editingResearchId ? { ...res, ...updatedData } : res));
        triggerToast("Research updated locally!", "success");
      }
      resetResearchForm();
      return;
    }

    const item = { ...newResearch, id: "res-" + Date.now() };
    if (isLive && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'research'), newResearch);
        triggerToast("New research successfully uploaded to cloud!", "success");
      } catch (e: any) {
        triggerToast("Failed to upload research.", "error");
      }
    } else {
      setResearch([...research, item]);
      triggerToast("New research added locally!", "success");
    }
    resetResearchForm();
  };

  const handleDeleteResearch = async (id: string) => {
    if (isLive && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'research', id));
        triggerToast("Research successfully deleted!", "success");
      } catch (e: any) {
        triggerToast("Failed to delete research.", "error");
      }
    } else {
      setResearch(research.filter(x => x.id !== id));
      triggerToast("Local research deleted!", "info");
    }
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.name) {
      triggerToast("Skill name is required.", "error");
      return;
    }
    const updatedData = { ...newSkill };
    if (editingSkillId) {
      if (isLive && db) {
        try {
          await handleUpdateSkill(editingSkillId, updatedData);
          triggerToast("Skill updated successfully!", "success");
        } catch (e: any) {
          console.error("Failed to update skill:", e);
          triggerToast(`Failed to update skill. ${e?.message || "Please try again."}`, "error");
        }
      } else {
        setSkills(skills.map((skill) => skill.id === editingSkillId ? { ...skill, ...updatedData } : skill));
        triggerToast("Skill updated locally!", "success");
      }
      setEditingSkillId(null);
      setNewSkill({ name: "", category: "Data Analyst" });
      return;
    }

    const item = { ...newSkill, id: "sk-" + Date.now() };
    if (isLive && db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'skills'), newSkill);
        triggerToast("Skill added to cloud successfully!", "success");
      } catch (e) {
        triggerToast("Failed to upload skill.", "error");
      }
    } else {
      setSkills([...skills, item]);
      triggerToast("Skill added locally!", "success");
    }
    setNewSkill({ name: "", category: "Data Analyst" });
  };

  const handleDeleteSkill = async (id: string) => {
    if (isLive && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'skills', id));
        triggerToast("Skill removed from cloud!", "success");
      } catch (e) {
        triggerToast("Failed to delete skill.", "error");
      }
    } else {
      setSkills(skills.filter(x => x.id !== id));
      triggerToast("Skill deleted locally!", "info");
    }
  };

  if (isAppInitializing || isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-900 font-sans antialiased">
        <div className="flex flex-col items-center gap-4 p-6 rounded-3xl shadow-xl border border-zinc-200">
          <div className="h-12 w-12 rounded-full border-4 border-zinc-200 border-t-zinc-900 animate-spin" />
          <p className="text-sm text-zinc-600">Loading portfolio data…</p>
        </div>
      </div>
    );
  }

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

      {/* ============================================================================
          8. NAVIGASI / NAVBAR MODERN
          ============================================================================ */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-150">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("portfolio")}>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white font-bold text-sm">
                {profile.name ? profile.name.charAt(0) : "A"}
              </div>
              <span className="font-bold tracking-tight text-zinc-900">
                {profile.name || "Portfolio Creator"}
              </span>
            </div>

            {!(activeTab === 'cms' && isAdmin) && (
              <div className="hidden md:flex items-center gap-2">
                {[
                  { id: 'about', label: 'About Me', section: 'hero' },
                  { id: 'projects', label: 'Projects', section: 'works' },
                  { id: 'work', label: 'Work', section: 'experience' },
                  { id: 'skills', label: 'Skills', section: 'skills' },
                  { id: 'education', label: 'Education', section: 'education' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToPortfolioSection(item.id as any, item.section)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition-all ${portfolioSectionTab === item.id ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => { setActiveTab("portfolio"); setMobileMenuOpen(false); }}
              className={`text-sm font-medium transition-colors ${activeTab === 'portfolio' ? 'text-zinc-950 underline underline-offset-8 decoration-2' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              Portfolio Page
            </button>
            <button
              onClick={() => {
                if (isAdmin) {
                  setActiveTab("cms");
                } else {
                  setShowLoginModal(true);
                }
              }}
              className={`text-sm font-medium transition-all px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'cms'
                ? 'bg-zinc-100 text-zinc-950 font-semibold border border-zinc-200'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              {isAdmin ? "CMS Dashboard" : "Admin Login"}
            </button>
            {isAdmin && (
              <button
                onClick={handleAdminLogout}
                title="Logout Admin"
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
              Portfolio Page
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
              {isAdmin ? "CMS Dashboard" : "Admin Login"}
            </button>
            {isAdmin && (
              <button
                onClick={() => { handleAdminLogout(); setMobileMenuOpen(false); }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Logout Admin
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
          <section
            data-animate-section="hero"
            onMouseMove={(e) => {
              const bounds = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - bounds.left) / bounds.width - 0.5) * 18;
              const y = ((e.clientY - bounds.top) / bounds.height - 0.5) * -10;
              setHeroMotion({ x, y });
            }}
            onMouseLeave={() => setHeroMotion({ x: 0, y: 0 })}
            className={`${sectionMotionClass('hero')} scroll-mt-28 md:scroll-mt-32 flex flex-col md:grid md:grid-cols-12 md:text-left md:items-center gap-8 pt-4 pb-8 border-b border-zinc-100`}
          >
            <div className={`col-span-1 md:col-span-8 space-y-6 order-last md:order-first transition-all ${introAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="space-y-3">
                <span className="text-sm font-bold tracking-widest text-zinc-400 uppercase">Open for Collaboration</span>
                <h1 className={`text-4xl md:text-5xl lg:text-6xl font-extrabold text-zinc-900 tracking-tight leading-tight ${introAnimated ? 'fly-in' : 'opacity-0'}`}>
                  Hi, I'm {profile.name || "Portfolio Creator"}
                </h1>
                <p className={`text-xl md:text-2xl font-medium text-zinc-600 ${introAnimated ? 'fly-in fly-in-delay' : 'opacity-0'}`}>
                  {profile.title || "Crafting modern web experiences"}
                </p>
              </div>
              <p className="text-base md:text-lg text-zinc-500 leading-relaxed max-w-2xl">
                {profile.bio || "Welcome to my portfolio. Your content will appear here once Firebase data is loaded."}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={downloadCV}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all hover:shadow flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {profile.cvUrl ? 'Download CV' : 'Print / Save CV'}
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
                    Send Email
                  </a>
                )}
              </div>
            </div>

            <div className="md:col-span-4 order-first md:order-last flex md:justify-end">
              <div
                className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-60 md:h-60 rounded-3xl overflow-hidden shadow-inner border border-zinc-200 bg-zinc-50 flex transition-transform duration-300"
                style={{ transform: `perspective(700px) rotateY(${heroMotion.x}deg) rotateX(${heroMotion.y}deg)` }}
              >

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
                  <img
                    src={abcd}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                )}

              </div>
            </div>
          </section>

          {/* ============================================================================
              SISTEM TAB PROYEK VS RISET + PAGINATION (MAX 4) + ON CLICK MODAL
              ============================================================================ */}
          <section
            id="works-section"
            data-animate-section="works"
            className={`${sectionMotionClass('works')} space-y-8 scroll-mt-28 md:scroll-mt-32`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Projects</h2>
              </div>

              {/* TAB SWITCHER */}
              <div className="inline-flex p-1 bg-zinc-100 rounded-xl self-start md:self-auto">
                <button
                  onClick={() => setPortfolioWorksTab("projects")}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${portfolioWorksTab === "projects"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                    }`}
                >
                  💻 Application Project
                </button>
                <button
                  onClick={() => setPortfolioWorksTab("research")}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${portfolioWorksTab === "research"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                    }`}
                >
                  🔬 Research
                </button>
              </div>
            </div>

            {/* TAB CONTENT: PROYEK */}
            {portfolioWorksTab === "projects" && (
              <div className="space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-zinc-500">Sort projects by title.</p>
                  <div className="inline-flex overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setProjectSortOrder('asc')}
                      className={`px-4 py-2 text-xs font-semibold transition ${projectSortOrder === 'asc' ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
                    >
                      A → Z
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectSortOrder('desc')}
                      className={`px-4 py-2 text-xs font-semibold transition ${projectSortOrder === 'desc' ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
                    >
                      Z → A
                    </button>
                  </div>
                </div>
                {paginatedProjects.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-zinc-500">
                    <p className="text-sm font-medium">No projects are available yet.</p>
                    <p className="mt-2 text-xs text-zinc-400">Add your first project in the CMS to display it here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {paginatedProjects.map((project, index) => (
                      <div
                        key={project.id || index}
                        onMouseEnter={() => setHoveredWorkId(project.id)}
                        onMouseLeave={() => setHoveredWorkId(null)}
                        onClick={() => { setSelectedWork(project); setWorkType('project'); }}
                        className={`group bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full cursor-pointer ${hoveredWorkId === project.id ? 'scale-[1.01] shadow-2xl' : ''}`}
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
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
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
                                  Demo
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Kontrol Navigasi Halaman Proyek */}
                {paginatedProjects.length > 0 && totalProjectPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                      onClick={() => setProjectPageAndScroll(Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 disabled:opacity-40 rounded-lg transition-all"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-semibold text-zinc-500">
                      Page {currentPage} of {totalProjectPages}
                    </span>
                    <button
                      onClick={() => setProjectPageAndScroll(Math.min(currentPage + 1, totalProjectPages))}
                      disabled={currentPage === totalProjectPages}
                      className="px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-40 rounded-lg transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: RISET (HANYA GAMBAR & DESKRIPSI) */}
            {portfolioWorksTab === "research" && (
              <div className="space-y-8">
                {paginatedResearch.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-zinc-500">
                    <p className="text-sm font-medium">No research items are available yet.</p>
                    <p className="mt-2 text-xs text-zinc-400">Add research cases from the CMS to populate this section.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {paginatedResearch.map((item, index) => (
                      <div
                        key={item.id || index}
                        onMouseEnter={() => setHoveredWorkId(item.id)}
                        onMouseLeave={() => setHoveredWorkId(null)}
                        onClick={() => { setSelectedWork(item); setWorkType('research'); }}
                        className={`group bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full cursor-pointer ${hoveredWorkId === item.id ? 'scale-[1.01] shadow-2xl' : ''}`}
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
                              Research
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
                              📂 Open Publication
                            </span>
                            <span>Peer-Reviewed</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Kontrol Navigasi Halaman Riset */}
                {paginatedResearch.length > 0 && totalResearchPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 disabled:opacity-40 rounded-lg transition-all"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-semibold text-zinc-500">
                      Page {currentPage} of {totalResearchPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalResearchPages))}
                      disabled={currentPage === totalResearchPages}
                      className="px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-40 rounded-lg transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Bagian 2: Pengalaman Kerja */}
          <section data-animate-section="experience" className={`${sectionMotionClass('experience')} scroll-mt-28 md:scroll-mt-32 space-y-8`}>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Work Experience</h2>
            </div>

            <div className="relative border-l-2 border-zinc-150 pl-6 space-y-12 ml-4">
              {experience.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-zinc-500">
                  <p className="text-sm font-medium">Work experience data is not available.</p>
                  <p className="mt-2 text-xs text-zinc-400">Update the CMS to show your career history here.</p>
                </div>
              ) : (
                experience.map((item, index) => {
                  return (
                    <div
                      key={item.id || index}
                      onMouseEnter={() => setActiveExperienceId(item.id)}
                      onMouseLeave={() => setActiveExperienceId(null)}
                      className={`relative group transition-all duration-300 ${activeExperienceId === item.id ? 'bg-zinc-50 shadow-lg rounded-3xl p-6' : 'hover:bg-zinc-50/60'} `}
                    >
                      <span className="absolute -left-9 top-1.5 w-5 h-5 rounded-full border-4 border-white bg-zinc-900 shadow-sm group-hover:scale-125 transition-transform" />

                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block">
                          {item.duration}
                        </span>
                        <h3 className="text-lg font-bold text-zinc-900">
                          {item.role} <span className="text-zinc-400 font-normal">at</span> {item.company}
                        </h3>
                        <p className="text-zinc-500 leading-relaxed max-w-3xl pt-2 text-sm md:text-base">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Bagian 4: Keahlian Utama */}
          <section data-animate-section="skills" className={`${sectionMotionClass('skills')} scroll-mt-28 md:scroll-mt-32 space-y-8`}>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Skills & Technologies</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {['Data Analyst', 'Data Visualization', 'Data Science'].map((category) => {
                const filtered = skills.filter(s => s.category?.toLowerCase() === category.toLowerCase());
                return (
                  <div
                    key={category}
                    onMouseEnter={() => setHoveredSkillCategory(category)}
                    onMouseLeave={() => setHoveredSkillCategory(null)}
                    className={`border border-zinc-150 rounded-xl p-6 bg-zinc-50/50 transition-all duration-300 ${hoveredSkillCategory === category ? 'ring-2 ring-zinc-300 shadow-lg' : 'hover:border-zinc-300'}`}
                  >
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
                        <span className="text-zinc-400 text-xs italic">No skills available</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bagian 5: Riwayat Pendidikan */}
          <section data-animate-section="education" className={`${sectionMotionClass('education')} scroll-mt-28 md:scroll-mt-32 space-y-8`}>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Education</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {education.length === 0 ? (
                <div className="col-span-1 md:col-span-2 rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-zinc-500">
                  <p className="text-sm font-medium">Education history is not available yet.</p>
                  <p className="mt-2 text-xs text-zinc-400">Add your education entries in the CMS to display them here.</p>
                </div>
              ) : (
                education.map((edu, index) => {
                  return (
                    <div
                      key={edu.id || index}
                      onMouseEnter={() => setHoveredEducationId(edu.id)}
                      onMouseLeave={() => setHoveredEducationId(null)}
                      className={`border border-zinc-200 p-6 rounded-xl space-y-3 relative overflow-hidden bg-white transition-all duration-300 ${hoveredEducationId === edu.id ? 'shadow-2xl scale-[1.02] border-zinc-300' : 'hover:shadow-md'}`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-zinc-400 block">{edu.year}</span>
                        <h3 className="text-lg font-bold text-zinc-900">{edu.degree}</h3>
                        <h4 className="text-sm font-semibold text-zinc-600">{edu.school}</h4>
                      </div>
                      <p className="text-zinc-500 text-sm leading-relaxed">{edu.description}</p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

        </main>
      )}

      {/* ============================================================================
          10. DASBOR ADMINISTRASI CMS
          ============================================================================ */}
      {activeTab === "cms" && !isAdmin && (
        <main className="max-w-4xl mx-auto px-6 py-20 min-h-[60vh] flex items-center justify-center">
          <div className="w-full bg-white border border-zinc-200 rounded-3xl shadow-xl p-10 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <div className="h-8 w-8 rounded-full border-4 border-zinc-300 border-t-zinc-900 animate-spin" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-zinc-900">Preparing CMS Access</h2>
              <p className="text-sm text-zinc-500">
                Please sign in first to continue to the admin dashboard. If nothing happens, click the button below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              Open Admin Login
            </button>
          </div>
        </main>
      )}
      {activeTab === "cms" && isAdmin && (
        <main className="max-w-6xl mx-auto px-6 py-12">

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-8 border-b border-zinc-200 mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">CMS Dashboard</h1>
              </div>
              <p className="text-zinc-500 text-sm mt-1">
                Change, add, and control your portfolio content in real-time.
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
                View Portfolio
              </button>
              <button
                onClick={handleAdminLogout}
                className="bg-red-50 text-red-600 hover:bg-red-100 text-sm font-semibold px-4 py-2.5 rounded-lg border border-red-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Sidebar CMS */}
            <aside className="lg:col-span-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 p-1 bg-zinc-50 border border-zinc-200 rounded-xl">
              {cmsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCmsTab(tab.id)}
                  className={`w-full text-left whitespace-nowrap px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 ${cmsTab === tab.id
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
                    <h2 className="text-lg font-bold text-zinc-900">Manage Profile Information</h2>
                    <p className="text-xs text-zinc-400">Adjust your main description for public view.</p>
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
                        <label className="text-xs font-bold text-zinc-500 uppercase">Full Name</label>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Professional Title</label>
                        <input
                          type="text"
                          value={profile.title}
                          onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Short Biography</label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        rows={3}
                        className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Location</label>
                        <input
                          type="text"
                          value={profile.location || ""}
                          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">LinkedIn Profile</label>
                        <input
                          type="url"
                          value={profile.linkedin}
                          onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">GitHub Profile</label>
                        <input
                          type="url"
                          value={profile.github}
                          onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Email Address</label>
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Profile Photo URL</label>
                        <input
                          type="text"
                          value={profile.photoUrl || ""}
                          onChange={(e) => setProfile({ ...profile, photoUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'profilePhoto')}
                            disabled={isUploading.profilePhoto}
                            className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                          />
                          {isUploading.profilePhoto && (
                            <span className="text-xs text-zinc-500 animate-pulse font-semibold">
                              Uploading ({uploadProgress.profilePhoto}%)…
                            </span>
                          )}
                          {profile.photoUrl && (
                            <button
                              type="button"
                              title="Hapus Foto"
                              onClick={() => setProfile({ ...profile, photoUrl: "" })}
                              className="ml-auto p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">CV Document URL (PDF/Doc)</label>
                        <input
                          type="text"
                          value={profile.cvUrl || ""}
                          onChange={(e) => setProfile({ ...profile, cvUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => handleFileUpload(e, 'cv')}
                            disabled={isUploading.cv}
                            className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                          />
                          {isUploading.cv && (
                            <span className="text-xs text-zinc-500 animate-pulse font-semibold">
                              Uploading ({uploadProgress.cv}%)…
                            </span>
                          )}
                          {profile.cvUrl && (
                            <button
                              type="button"
                              title="Hapus CV"
                              onClick={() => setProfile({ ...profile, cvUrl: "" })}
                              className="ml-auto p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-2"
                    >
                      Save Profile Changes
                    </button>
                  </form>
                </div>
              )}

              {/* TAB CMS 2: KELOLA KARYA (PROYEK & RISET) */}
              {cmsTab === "works" && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900">Manage Work Results</h2>
                      <p className="text-xs text-zinc-400">Select the tab below to manage Projects or Research separately.</p>
                    </div>

                    {/* Sub-tab manajemen di CMS */}
                    <div className="inline-flex p-1 bg-zinc-100 rounded-lg">
                      <button
                        onClick={() => setCmsWorksSubTab("projects")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${cmsWorksSubTab === "projects" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
                          }`}
                      >
                        Application Project
                      </button>
                      <button
                        onClick={() => setCmsWorksSubTab("research")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${cmsWorksSubTab === "research" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
                          }`}
                      >
                        Research
                      </button>
                    </div>
                  </div>

                  {/* KONTEN KELOLA PROYEK */}
                  {cmsWorksSubTab === "projects" && (
                    <div className="space-y-6">
                      {/* Form Tambah / Edit Proyek */}
                      <form ref={projectFormRef} onSubmit={handleSaveProject} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50 space-y-4">
                        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                          {editingProjectId ? "✏️ Edit Project" : "➕ Add New Project"}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Project Title</label>
                            <input
                              type="text"
                              value={newProject.title}
                              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                              placeholder="Example: Zenith Task Manager"
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Image Link (Image URL)</label>
                            <input
                              type="text"
                              value={newProject.imageUrl}
                              onChange={(e) => setNewProject({ ...newProject, imageUrl: e.target.value })}
                              placeholder="https://images.unsplash.com/..."
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'project')}
                                disabled={isUploading.project}
                                className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                              />
                              {isUploading.project && (
                                <span className="text-xs text-zinc-500 animate-pulse font-semibold">
                                  Uploading ({uploadProgress.project}%)…
                                </span>
                              )}
                              {newProject.imageUrl && (
                                <button
                                  type="button"
                                  title="Hapus Gambar"
                                  onClick={() => setNewProject({ ...newProject, imageUrl: "" })}
                                  className="ml-auto p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500">Gallery Images</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newProjectGalleryUrl}
                                onChange={(e) => setNewProjectGalleryUrl(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addProjectGalleryImage();
                                  }
                                }}
                                placeholder="Add gallery image URL"
                                className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={addProjectGalleryImage}
                                className="text-xs font-semibold uppercase tracking-wide px-3 py-2 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 transition-colors"
                              >
                                Add
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'projectGallery')}
                                disabled={isUploading.projectGallery}
                                className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                              />
                              {isUploading.projectGallery && (
                                <span className="text-xs text-zinc-500 animate-pulse font-semibold">
                                  Uploading gallery image ({uploadProgress.projectGallery}%)…
                                </span>
                              )}
                            </div>
                            {newProject.gallery.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {newProject.gallery.map((img, idx) => (
                                  <div key={idx} className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 border border-zinc-200">
                                    <span className="truncate max-w-[180px]">{img}</span>
                                    <button
                                      type="button"
                                      onClick={() => setNewProject((prev) => ({
                                        ...prev,
                                        gallery: prev.gallery.filter((_, i) => i !== idx),
                                      }))}
                                      className="text-zinc-500 hover:text-red-600"
                                      title="Remove gallery image"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">GitHub Link (Repository)</label>
                            <input
                              type="url"
                              value={newProject.githubLink}
                              onChange={(e) => setNewProject({ ...newProject, githubLink: e.target.value })}
                              placeholder="https://github.com/username/project"
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Live Demo Link</label>
                            <input
                              type="url"
                              value={newProject.demoLink}
                              onChange={(e) => setNewProject({ ...newProject, demoLink: e.target.value })}
                              placeholder="https://project-demo.com"
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500">Technology Stack (comma-separated)</label>
                          <input
                            type="text"
                            value={newProject.tech_stack}
                            onChange={(e) => setNewProject({ ...newProject, tech_stack: e.target.value })}
                            placeholder="React, Tailwind, Node.js"
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500">Short Description</label>
                          <textarea
                            value={newProject.description}
                            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                            placeholder="Write a brief explanation about the project's functionality and advantages..."
                            rows={2}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="submit"
                            className="bg-zinc-950 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                          >
                            {editingProjectId ? "Update Project" : "Publish Project"}
                          </button>
                          {editingProjectId && (
                            <button
                              type="button"
                              onClick={resetProjectForm}
                              className="text-zinc-700 bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold uppercase px-4 py-2.5 rounded-lg transition-colors"
                            >
                              Cancel Edit
                            </button>
                          )}
                        </div>
                      </form>

                      {/* List Proyek yang Aktif */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Projects</h3>
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
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditProject(proj)}
                                      className="p-2 rounded-full text-zinc-700 hover:bg-zinc-100 transition-colors"
                                      title="Edit Project"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l6 6L21 9l-6-6-6 6z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProject(proj.id)}
                                      className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                                      title="Delete Project"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
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
                      <form ref={researchFormRef} onSubmit={handleAddResearch} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50 space-y-4">
                        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                          {editingResearchId ? "✏️ Edit Research" : "➕ Add New Research Result"}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Research Title / Journal</label>
                            <input
                              type="text"
                              value={newResearch.title}
                              onChange={(e) => setNewResearch({ ...newResearch, title: e.target.value })}
                              placeholder="Example: Analysis of CPU Performance in UI Rendering"
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">Research Image Link (Technical Illustration)</label>
                            <input
                              type="text"
                              value={newResearch.imageUrl}
                              onChange={(e) => setNewResearch({ ...newResearch, imageUrl: e.target.value })}
                              placeholder="https://images.unsplash.com/..."
                              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'research')}
                                disabled={isUploading.research}
                                className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                              />
                              {isUploading.research && (
                                <span className="text-xs text-zinc-500 animate-pulse font-semibold">
                                  Uploading ({uploadProgress.research}%)…
                                </span>
                              )}
                              {newResearch.imageUrl && (
                                <button
                                  type="button"
                                  title="Hapus Gambar"
                                  onClick={() => setNewResearch({ ...newResearch, imageUrl: "" })}
                                  className="ml-auto p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500">Abstract / Research Description</label>
                          <textarea
                            value={newResearch.description}
                            onChange={(e) => setNewResearch({ ...newResearch, description: e.target.value })}
                            placeholder="Explain the research findings, data compression methodology, and practical conclusions..."
                            rows={3}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-col md:flex-row items-start gap-3">
                          <button
                            type="submit"
                            className="bg-zinc-950 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                          >
                            {editingResearchId ? "Save Research" : "Publish Research"}
                          </button>
                          {editingResearchId && (
                            <button
                              type="button"
                              onClick={resetResearchForm}
                              className="bg-zinc-100 text-zinc-700 text-xs font-bold uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors"
                            >
                              Cancel Edit
                            </button>
                          )}
                        </div>
                      </form>

                      {/* List Riset yang Aktif */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Research Papers</h3>
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
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditResearch(res)}
                                      className="p-2 rounded-full text-zinc-700 hover:bg-zinc-100 transition-colors"
                                      title="Edit Research"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l6 6L21 9l-6-6-6 6z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteResearch(res.id)}
                                      className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                                      title="Delete Research"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
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
                    <h2 className="text-lg font-bold text-zinc-900">Manage Professional Career</h2>
                    <p className="text-xs text-zinc-400">Add or remove work history from institutions where you have contributed.</p>
                  </div>

                  <form onSubmit={handleSaveExperience} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50 space-y-4">
                    <h3 className="text-xs font-bold text-zinc-600 uppercase">
                      {editingExperienceId ? "✏️ Edit Experience" : "➕ Add Experience"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Company Name</label>
                        <input
                          type="text"
                          value={newExperience.company}
                          onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                          placeholder="Stripe, Gojek, Tokopedia"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Job Position</label>
                        <input
                          type="text"
                          value={newExperience.role}
                          onChange={(e) => setNewExperience({ ...newExperience, role: e.target.value })}
                          placeholder="Senior Developer"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Time Period</label>
                        <input
                          type="text"
                          value={newExperience.duration}
                          onChange={(e) => setNewExperience({ ...newExperience, duration: e.target.value })}
                          placeholder="2022 - Now"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500">Career Responsibilities</label>
                      <textarea
                        value={newExperience.description}
                        onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                        placeholder="Explain your main achievements and technical skills..."
                        rows={3}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        className="bg-zinc-950 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        {editingExperienceId ? "Update Experience" : "Add Experience"}
                      </button>
                      {editingExperienceId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExperienceId(null);
                            setNewExperience({ company: "", role: "", duration: "", description: "" });
                          }}
                          className="text-zinc-700 bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold uppercase px-4 py-2.5 rounded-lg transition-colors"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Career Experiences</h3>
                    <div className="divide-y divide-zinc-150">
                      {experience.map(item => (
                        <div key={item.id} className="py-4 flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-zinc-900">{item.role} <span className="text-zinc-400 font-normal">at</span> {item.company}</h4>
                            <p className="text-xs text-zinc-400 font-bold">{item.duration}</p>
                            <p className="text-xs text-zinc-600 line-clamp-2">{item.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExperienceId(item.id);
                                setNewExperience({
                                  company: item.company || "",
                                  role: item.role || "",
                                  duration: item.duration || "",
                                  description: item.description || "",
                                });
                              }}
                              className="p-2 rounded-full text-zinc-700 hover:bg-zinc-100 transition-colors"
                              title="Edit Experience"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l6 6L21 9l-6-6-6 6z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExperience(item.id)}
                              className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete Experience"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
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
                    <h2 className="text-lg font-bold text-zinc-900">Manage Skill Matrix</h2>
                    <p className="text-xs text-zinc-400">Classify your abilities into data analyst, data visualization, or tools categories.</p>
                  </div>

                  <form onSubmit={handleSaveSkill} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                    <div className="md:col-span-3">
                      <h3 className="text-xs font-bold text-zinc-600 uppercase mb-3">
                        {editingSkillId ? "✏️ Edit Skill" : "➕ Add Skill"}
                      </h3>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <label className="text-xs font-bold text-zinc-500">Skill Name</label>
                      <input
                        type="text"
                        value={newSkill.name}
                        onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                        placeholder="Example: NextJS"
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <label className="text-xs font-bold text-zinc-500">Classification Category</label>
                      <select
                        value={newSkill.category}
                        onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      >
                        <option value="Data Analyst">Data Analyst</option>
                        <option value="Data Visualization">Data Visualization</option>
                        <option value="Data Science">Data Science</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        className="bg-zinc-950 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        {editingSkillId ? "Update Skill" : "Add Skill"}
                      </button>
                      {editingSkillId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSkillId(null);
                            setNewSkill({ name: "", category: "Data Analyst" });
                          }}
                          className="text-zinc-700 bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold uppercase px-4 py-2.5 rounded-lg transition-colors"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Data Analyst', 'Data Visualization', 'Data Science'].map(category => {
                      const filtered = skills.filter(s => s.category?.toLowerCase() === category.toLowerCase());
                      return (
                        <div key={category} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50/50 space-y-3">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{category}</h4>
                          <div className="flex flex-col gap-1.5">
                            {filtered.map(item => (
                              <div key={item.id} className="bg-white px-3 py-1.5 rounded-lg border border-zinc-200 flex items-center justify-between shadow-sm gap-2">
                                <span className="text-xs font-medium text-zinc-800">{item.name}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSkillId(item.id);
                                      setNewSkill({ name: item.name || "", category: item.category || "Data Analyst" });
                                    }}
                                    className="p-2 rounded-full text-zinc-700 hover:bg-zinc-100 transition-colors"
                                    title="Edit Skill"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l6 6L21 9l-6-6-6 6z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSkill(item.id)}
                                    className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                                    title="Delete Skill"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
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
                    <h2 className="text-lg font-bold text-zinc-900">Manage Academic Education</h2>
                    <p className="text-xs text-zinc-400">Organize your academic background and educational history.</p>
                  </div>

                  <form onSubmit={handleSaveEducation} className="p-4 border border-zinc-150 rounded-xl bg-zinc-50 space-y-4">
                    <h3 className="text-xs font-bold text-zinc-600 uppercase">
                      {editingEducationId ? "✏️ Edit Education" : "➕ Add Education"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">University / School Name</label>
                        <input
                          type="text"
                          value={newEducation.school}
                          onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })}
                          placeholder="Indonesia University of Education"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Educational Degree</label>
                        <input
                          type="text"
                          value={newEducation.degree}
                          onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
                          placeholder="S1 Teknik Informatika"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">Graduation Year</label>
                        <input
                          type="text"
                          value={newEducation.year}
                          onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })}
                          placeholder="2018 - 2022"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500">Additional Information</label>
                      <textarea
                        value={newEducation.description}
                        onChange={(e) => setNewEducation({ ...newEducation, description: e.target.value })}
                        placeholder="GPA, research focus, or student organization activities..."
                        rows={2}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        className="bg-zinc-950 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        {editingEducationId ? "Update Education" : "Save Education"}
                      </button>
                      {editingEducationId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEducationId(null);
                            setNewEducation({ school: "", degree: "", year: "", description: "" });
                          }}
                          className="text-zinc-700 bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold uppercase px-4 py-2.5 rounded-lg transition-colors"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Education Displayed</h3>
                    <div className="divide-y divide-zinc-150">
                      {education.map(edu => (
                        <div key={edu.id} className="py-4 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-zinc-900">{edu.degree}</h4>
                            <p className="text-xs text-zinc-500 font-semibold">{edu.school} — {edu.year}</p>
                            <p className="text-xs text-zinc-600 line-clamp-2">{edu.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEducationId(edu.id);
                                setNewEducation({
                                  school: edu.school || "",
                                  degree: edu.degree || "",
                                  year: edu.year || "",
                                  description: edu.description || "",
                                });
                              }}
                              className="p-2 rounded-full text-zinc-700 hover:bg-zinc-100 transition-colors"
                              title="Edit Education"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l6 6L21 9l-6-6-6 6z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEducation(edu.id)}
                              className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete Education"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
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
        <>
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
                  {workType === 'project' ? 'Application Project' : 'Research'}
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">{selectedWork.title}</h2>
              </div>
            </div>

            {/* Konten Scrollable */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Full Description</h3>
                <p className="text-zinc-600 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                  {selectedWork.description}
                </p>
              </div>

              {workType === 'project' && selectedWork.tech_stack && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Technologies Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedWork.tech_stack.split(',').map((tech, i) => (
                      <span key={i} className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {workType === 'project' && Array.isArray(selectedWork.gallery) && selectedWork.gallery.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Project Gallery</h3>
                  <div className="max-h-64 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedWork.gallery.map((imageUrl: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedGalleryImage(imageUrl)}
                          className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                        >
                          <img
                            src={imageUrl}
                            alt={`${selectedWork.title} gallery ${idx + 1}`}
                            className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80'; }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tombol Aksi Modal */}
              {workType === 'project' && (selectedWork.githubLink || selectedWork.demoLink) && (
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-100">
                  {selectedWork.githubLink && (
                    <a href={selectedWork.githubLink} target="_blank" rel="noreferrer" className="flex-1 md:flex-none justify-center text-sm font-bold text-zinc-700 hover:text-zinc-950 transition-all flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-5 py-3 rounded-xl">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" /></svg>
                      View Repository
                    </a>
                  )}
                  {selectedWork.demoLink && (
                    <a href={selectedWork.demoLink} target="_blank" rel="noreferrer" className="flex-1 md:flex-none justify-center text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all flex items-center gap-2 px-5 py-3 rounded-xl shadow-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      Visit Demo
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedGalleryImage && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <button
              type="button"
              onClick={() => setSelectedGalleryImage(null)}
              className="absolute top-4 right-4 z-50 rounded-full bg-white/90 p-3 text-zinc-900 shadow-lg hover:bg-white transition-colors"
              aria-label="Close gallery zoom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="max-w-[90vw] max-h-[90vh] overflow-auto rounded-3xl border border-white/10 shadow-2xl bg-black">
              <img
                src={selectedGalleryImage}
                alt="Gallery zoom"
                className="w-full h-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80'; }}
              />
            </div>
          </div>
        )}
      </>
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
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Admin CMS Gate</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Use the admin password to add or edit your portfolio content matrix.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Admin Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg px-3 py-2 text-sm focus:outline-none transition-all font-mono"
                />
                <p className="text-[10px] text-zinc-400 italic pt-1 text-center">
                  Default activated bypass demo. Just click "Password Verification" directly.
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
                    Password Verification
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
              {profile.name} — Portfolio Studio
            </h3>
            <p className="text-xs text-zinc-400">
              Made by a passionate frontend developer with a love for clean design and seamless user experience.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-zinc-400">
            <span>© 2026. Copyright Reserved.</span>
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
              Portal Management System
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}