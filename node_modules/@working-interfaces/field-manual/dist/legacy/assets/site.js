
const root=document.documentElement;
root.dataset.theme=localStorage.getItem('field-manual-theme') ||
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light');
function toggleTheme(){
 root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';
 localStorage.setItem('field-manual-theme',root.dataset.theme);
}
async function copyPrompt(){
 const el=document.getElementById('starterPrompt');
 try{
   await navigator.clipboard.writeText(el.innerText);
   const b=document.getElementById('copyPrompt');
   const old=b.textContent;b.textContent='Copied';
   setTimeout(()=>b.textContent=old,1200);
 }catch(e){}
}
