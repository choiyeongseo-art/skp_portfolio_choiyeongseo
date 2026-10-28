// Apply before styles load so a saved dark theme never flashes white.
(()=>{let theme='dark';try{const saved=localStorage.getItem('naru-studio-theme');if(saved==='light'||saved==='dark')theme=saved}catch{}document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme})();
