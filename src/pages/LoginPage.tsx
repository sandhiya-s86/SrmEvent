import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { apiLogin, apiRegister } from '../api';
import ThemeSwitcher from '../components/ThemeSwitcher';

interface LoginPageProps {
  onLogin: (user: User) => void;
  users: User[];
  addUser: (user: User) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

type Role = 'student' | 'organizer' | 'admin';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, users, addUser, theme, setTheme }) => {
  const [activeTab, setActiveTab] = useState<Role>('student');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const clearFormState = () => {
    setName('');
    setUsername('');
    setPassword('');
    setError('');
  };

  const handleTabChange = (role: Role) => {
    setActiveTab(role);
    clearFormState();
  };
  
  const handleSwitchMode = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsRegistering(prev => !prev);
    clearFormState();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let user: User | undefined;

    if (activeTab === 'student') {
      user = users.find(u => u.role === 'student' && u.name.toLowerCase() === name.toLowerCase());
      if (!user) {
        setError('Student not found. Please create an account or use a valid name (e.g., "Alex").');
        return;
      }
    } else {
      // Try real backend auth first
      (async () => {
        const backendUser: any = await apiLogin(username, password);
        if (backendUser) {
          const mapped: User = {
            id: backendUser.id ?? Date.now(),
            name: `${backendUser.firstName ?? ''} ${backendUser.lastName ?? ''}`.trim() || backendUser.email || username,
            role: (String(backendUser.role || activeTab).toLowerCase() as User['role']),
            username,
            password
          };
          onLogin(mapped);
          return;
        }

        // Fallback to mock users
        const local = users.find(u => u.role === activeTab && u.username === username && u.password === password);
        if (!local) {
          setError('Invalid credentials. Please create an account or try again.');
          return;
        }
        onLogin(local);
      })();
      return;
    }

    if (user) onLogin(user);
  };
  
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let existingUser: User | undefined;

    if (activeTab === 'student') {
      if (!name) {
        setError('Please enter your name.');
        return;
      }
      existingUser = users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.role === 'student');
      if (existingUser) {
        setError('A user with this name already exists. Please try logging in or use a different name.');
        return;
      }
      const newUser: User = { id: Date.now(), name, role: 'student' };
      addUser(newUser);
      onLogin(newUser);
    } else { // Organizer or Admin
      if (!name || !username || !password) {
        setError('Please fill in all fields.');
        return;
      }
      existingUser = users.find(u => u.username === username);
      if (existingUser) {
        setError('This username is already taken. Please choose another.');
        return;
      }
      // Try backend registration first
      (async () => {
        const [firstName, ...rest] = name.trim().split(' ');
        const lastName = rest.join(' ') || 'User';
        const email = username.includes('@') ? username : `${username}@srmuniv.local`;
        const backendUser: any = await apiRegister(email, password, firstName, lastName);
        if (backendUser) {
          const mapped: User = {
            id: backendUser.id ?? Date.now(),
            name: `${backendUser.firstName ?? firstName} ${backendUser.lastName ?? lastName}`.trim(),
            role: (String(backendUser.role || activeTab).toLowerCase() as User['role']),
            username,
            password
          };
          onLogin(mapped);
          return;
        }

        // Fallback to local creation
        const newUser: User = { id: Date.now(), name, role: activeTab, username, password };
        addUser(newUser);
        onLogin(newUser);
      })();
    }
  };

  const renderLoginForm = () => {
    if (activeTab === 'student') {
      return (
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Student Name
            </label>
            <div className="mt-1">
              <input
                id="studentName"
                name="studentName"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Alex"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-srm-blue focus:border-srm-blue sm:text-sm dark:bg-white dark:text-gray-900"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-srm-blue hover:bg-srm-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-srm-blue"
          >
            Sign in as Student
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={activeTab === 'organizer' ? 'ben' : 'casey'}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-srm-blue focus:border-srm-blue sm:text-sm dark:bg-white dark:text-gray-900"
            />
          </div>
        </div>
        <div>
          <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={activeTab === 'organizer' ? 'password123' : 'adminpass'}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-srm-blue focus:border-srm-blue sm:text-sm dark:bg-white dark:text-gray-900"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-srm-blue hover:bg-srm-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-srm-blue"
        >
          Sign in
        </button>
      </form>
    );
  };

  const renderRegisterForm = () => {
      const commonButtonClasses = "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-srm-blue hover:bg-srm-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-srm-blue";
      const commonInputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-srm-blue focus:border-srm-blue sm:text-sm dark:bg-white dark:text-gray-900";
    
      if (activeTab === 'student') {
      return (
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="registerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <div className="mt-1">
              <input id="registerName" name="registerName" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Alex Johnson" className={commonInputClasses} />
            </div>
          </div>
          <button type="submit" className={commonButtonClasses}>Create Student Account</button>
        </form>
      );
    }

    return (
      <form onSubmit={handleRegister} className="space-y-6">
        <div>
          <label htmlFor="registerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
          <div className="mt-1"><input id="registerName" name="registerName" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Ben Carter" className={commonInputClasses} /></div>
        </div>
        <div>
          <label htmlFor="registerUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
          <div className="mt-1"><input id="registerUsername" name="registerUsername" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Create a username" className={commonInputClasses} /></div>
        </div>
        <div>
          <label htmlFor="registerPassword"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <div className="mt-1"><input id="registerPassword" name="registerPassword" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" className={commonInputClasses} /></div>
        </div>
        <button type="submit" className={commonButtonClasses}>Create Account</button>
      </form>
    );
  };

  const TabButton: React.FC<{ role: Role; label: string }> = ({ role, label }) => (
    <button
      onClick={() => handleTabChange(role)}
      className={`w-full font-medium py-2.5 text-sm leading-5 rounded-lg
        ${activeTab === role
          ? 'bg-srm-blue text-white shadow'
          : 'text-gray-700 dark:text-gray-300 hover:bg-srm-blue/20'
        }
        focus:outline-none focus:ring-2 ring-offset-2 ring-offset-srm-blue-light ring-white ring-opacity-60 transition-colors`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 w-full lg:grid lg:grid-cols-2">
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitcher theme={theme} setTheme={setTheme} />
      </div>
      <div className="relative hidden lg:flex items-center justify-center bg-srm-blue-dark">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative text-center p-12">
            <h1 className="text-5xl font-extrabold text-white tracking-tight">
                Unlock Your Campus Experience
            </h1>
            <p className="mt-4 text-xl text-srm-blue-light font-semibold">
                Discover, connect, and thrive with events at SRM.
            </p>
        </div>
      </div>
      <div className="flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
         <div className="mx-auto w-full max-w-md">
            <div>
              <div className="flex justify-center items-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-srm-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-9.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-9.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                <h2 className="ml-3 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                  SRM Event Hub
                </h2>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
              <div className="mb-6">
                <div className="w-full flex space-x-1 rounded-xl bg-gray-200 dark:bg-gray-700 p-1">
                  <TabButton role="student" label="Student" />
                  <TabButton role="organizer" label="Organizer" />
                  <TabButton role="admin" label="Admin" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-center mb-4 text-gray-900 dark:text-white">
                {isRegistering ? `Create ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Account` : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Sign In`}
              </h3>
              
              {isRegistering ? renderRegisterForm() : renderLoginForm()}
              {error && <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="text-center mt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <a href="#" onClick={handleSwitchMode} className="font-medium text-srm-blue hover:text-srm-blue-dark dark:text-srm-blue-light dark:hover:text-srm-blue">
                        {isRegistering ? 'Sign in' : 'Create one here'}
                    </a>
                </p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;