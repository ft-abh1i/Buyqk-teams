import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ProfilePhotoUploader } from '../components/common/ProfilePhotoUploader';
import { ResumeUploader } from '../components/common/ResumeUploader';
import { 
  User, Briefcase, Building2, Phone, MapPin, Calendar, 
  Linkedin, Github, Globe, FileText, CheckCircle2, Sparkles, AlertCircle 
} from 'lucide-react';
import { db } from '@buyqk/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { EmployeeProfile } from '../types';

export const CompleteProfilePage: React.FC = () => {
  const { currentUser, profile, refreshProfile, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [photoUrl, setPhotoUrl] = useState<string>(profile?.photoUrl || currentUser?.photoURL || '');
  const [resumeUrl, setResumeUrl] = useState<string>(profile?.resumeUrl || '');
  const [resumeFileName, setResumeFileName] = useState<string>(profile?.resumeFileName || '');

  const [fullName, setFullName] = useState<string>(profile?.fullName || currentUser?.displayName || '');
  const [employeeId, setEmployeeId] = useState<string>(profile?.employeeId || '');
  const [designation, setDesignation] = useState<string>(profile?.designation || '');
  const [department, setDepartment] = useState<string>(profile?.department || 'Engineering');
  const [phone, setPhone] = useState<string>(profile?.phone || '');
  const [city, setCity] = useState<string>(profile?.city || '');
  const [state, setState] = useState<string>(profile?.state || '');
  const [joiningDate, setJoiningDate] = useState<string>(profile?.joiningDate || '');

  const [linkedin, setLinkedin] = useState<string>(profile?.linkedin || '');
  const [github, setGithub] = useState<string>(profile?.github || '');
  const [portfolio, setPortfolio] = useState<string>(profile?.portfolio || '');
  const [bio, setBio] = useState<string>(profile?.bio || '');
  const [skillsText, setSkillsText] = useState<string>(profile?.skills?.join(', ') || '');
  const [languagesText, setLanguagesText] = useState<string>(profile?.languages?.join(', ') || '');
  const [experience, setExperience] = useState<string>(profile?.experience || '');
  const [education, setEducation] = useState<string>(profile?.education || '');

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [autoFilled, setAutoFilled] = useState<boolean>(false);

  // Sync state if profile prop arrives after mount
  useEffect(() => {
    if (profile) {
      if (profile.fullName) setFullName(profile.fullName);
      if (profile.employeeId) setEmployeeId(profile.employeeId);
      if (profile.designation) setDesignation(profile.designation);
      if (profile.department) setDepartment(profile.department);
      if (profile.phone) setPhone(profile.phone);
      if (profile.city) setCity(profile.city);
      if (profile.state) setState(profile.state);
      if (profile.joiningDate) setJoiningDate(profile.joiningDate);
      if (profile.linkedin) setLinkedin(profile.linkedin);
      if (profile.github) setGithub(profile.github);
      if (profile.portfolio) setPortfolio(profile.portfolio);
      if (profile.bio) setBio(profile.bio);
      if (profile.skills) setSkillsText(profile.skills.join(', '));
      if (profile.languages) setLanguagesText(profile.languages.join(', '));
      if (profile.experience) setExperience(profile.experience);
      if (profile.education) setEducation(profile.education);
      if (profile.photoUrl) setPhotoUrl(profile.photoUrl);
      if (profile.resumeUrl) setResumeUrl(profile.resumeUrl);
      if (profile.resumeFileName) setResumeFileName(profile.resumeFileName);
    }
  }, [profile]);

  // When AI parses resume, auto-fill form fields if provided
  const handleResumeUploaded = (url: string, fileName: string, parsedData?: any) => {
    if (url) setResumeUrl(url);
    if (fileName) setResumeFileName(fileName);

    if (parsedData) {
      if (parsedData.fullName) setFullName(parsedData.fullName);
      if (parsedData.phone) setPhone(parsedData.phone);
      if (parsedData.linkedin) setLinkedin(parsedData.linkedin);
      if (parsedData.github) setGithub(parsedData.github);
      if (parsedData.skills && parsedData.skills.length > 0) {
        setSkillsText(parsedData.skills.join(', '));
      }
      if (parsedData.experience) setExperience(parsedData.experience);
      if (parsedData.education) setEducation(parsedData.education);
      setAutoFilled(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!fullName || fullName.trim().length === 0) {
      setError('Please provide your Full Name.');
      return;
    }

    const finalPhotoUrl = photoUrl || currentUser.photoURL || '';
    const finalEmployeeId = employeeId && employeeId.trim() ? employeeId.trim() : '';

    setError('');
    setSaving(true);

    try {
      const skillsArray = skillsText.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const languagesArray = languagesText.split(',').map(l => l.trim()).filter(l => l.length > 0);

      const userProfile: EmployeeProfile = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        fullName: fullName.trim() || 'Team Member',
        employeeId: finalEmployeeId,
        designation: designation.trim() || 'Software Engineer',
        department: department.trim() || 'Engineering',
        phone: phone.trim() || '+91 98765 43210',
        city: city.trim() || 'Bengaluru',
        state: state.trim() || 'Karnataka',
        joiningDate: joiningDate || '2026-08-01',
        linkedin: linkedin.trim(),
        github: github.trim(),
        portfolio: portfolio.trim(),
        bio: bio.trim(),
        skills: skillsArray,
        languages: languagesArray,
        experience: experience.trim(),
        education: education.trim(),
        photoUrl: finalPhotoUrl,
        resumeUrl: resumeUrl || '',
        resumeFileName: resumeFileName || (resumeUrl ? 'Resume.pdf' : ''),
        status: 'approved',
        isAdmin: isSuperAdmin,
        isSuperAdmin: isSuperAdmin,
        createdAt: profile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', currentUser.uid), userProfile, { merge: true });
      await refreshProfile();
      navigate('/teams/profile');
    } catch (err: any) {
      console.error("Save profile error:", err);
      setError(err.message || 'Failed saving profile. Please check fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-start p-4 sm:p-8 font-sans relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[140px] -top-40 left-1/2 -translate-x-1/2 pointer-events-none" />

      <main className="max-w-3xl w-full mx-auto my-auto relative z-10 flex flex-col gap-6">
        
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> {profile ? 'Edit Employee Profile' : 'First Login Profile Setup'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {profile ? 'Edit Your Employee Profile' : 'Complete Your Employee Profile'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md">
            {profile ? 'Update your personal, contact, and professional details below.' : 'Enter your details below to set up your team account.'}
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-slate-900/60 border border-blue-900/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
          
          {autoFilled && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl flex items-center gap-2 text-xs text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>AI Resume Parser successfully extracted and pre-filled your profile fields! Review below before saving.</span>
            </div>
          )}

          {/* Section 1: Profile Photo */}
          <div className="border-b border-slate-800 pb-6 flex flex-col items-center">
            <h3 className="text-xs font-extrabold uppercase text-slate-300 tracking-wider mb-4">1. Profile Picture (Optional)</h3>
            <ProfilePhotoUploader uid={currentUser?.uid || 'temp'} initialUrl={photoUrl} onUploadSuccess={setPhotoUrl} />
          </div>

          {/* Section 2: Resume Document */}
          <div className="border-b border-slate-800 pb-6">
            <h3 className="text-xs font-extrabold uppercase text-slate-300 tracking-wider mb-3">2. Resume Document & AI Parsing (Optional)</h3>
            <ResumeUploader uid={currentUser?.uid || 'temp'} initialResumeUrl={resumeUrl} onResumeUploaded={handleResumeUploaded} />
          </div>

          {/* Section 3: Basic Details */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-extrabold uppercase text-slate-300 tracking-wider border-b border-slate-800 pb-2">3. Employee Basic Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Akash Anand"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Employee ID Code (3 Digit Code from Offer Letter)</label>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  placeholder="e.g. 089"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Designation</label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  placeholder="e.g. Lead Frontend Engineer"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Department</label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="Engineering">Engineering & Technology</option>
                  <option value="Product">Product Management</option>
                  <option value="Design">UI/UX & Design</option>
                  <option value="Operations">Hyperlocal Operations</option>
                  <option value="HR">Human Resources</option>
                  <option value="Marketing">Marketing & Growth</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Joining Date</label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={e => setJoiningDate(e.target.value)}
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

            </div>
          </div>

          {/* Section 4: Socials & Bio */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-extrabold uppercase text-slate-300 tracking-wider border-b border-slate-800 pb-2">4. Portfolio, Social Links & Bio</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">LinkedIn URL</label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={e => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">GitHub URL</label>
                <input
                  type="url"
                  value={github}
                  onChange={e => setGithub(e.target.value)}
                  placeholder="https://github.com/username"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Portfolio Website</label>
                <input
                  type="url"
                  value={portfolio}
                  onChange={e => setPortfolio(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Professional Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Brief summary about your skills, role and background..."
                className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Technical Skills (Comma Separated)</label>
                <input
                  type="text"
                  value={skillsText}
                  onChange={e => setSkillsText(e.target.value)}
                  placeholder="React, TypeScript, Node.js, Firebase"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Languages (Comma Separated)</label>
                <input
                  type="text"
                  value={languagesText}
                  onChange={e => setLanguagesText(e.target.value)}
                  placeholder="English, Hindi, Kannada"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 font-semibold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm py-3.5 rounded-2xl shadow-gold-glow transition-all cursor-pointer mt-2"
          >
            {saving ? (
              <span>Saving Employee Profile...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" /> {profile ? 'Save & Update Profile' : 'Save Profile & Enter Teams Panel'}
              </>
            )}
          </button>

        </form>
      </main>

    </div>
  );
};
