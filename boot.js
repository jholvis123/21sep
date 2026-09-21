const canUseWebGL2=()=>{
  try{
    const canvas=document.createElement("canvas");
    const gl=canvas.getContext("webgl2",{alpha:true,antialias:false,failIfMajorPerformanceCaveat:false});
    if(!gl)return false;
    const lose=gl.getExtension("WEBGL_lose_context");
    if(lose)lose.loseContext();
    return true;
  }catch{return false}
};

const load=async()=>{
  const full=canUseWebGL2();
  document.documentElement.dataset.renderMode=full?"webgl":"lite";
  try{
    await import(full?"./app.js?v=20260921-compat8":"./lite.js?v=20260921-compat8");
  }catch(error){
    console.warn("Falling back to compatibility mode.",error);
    document.documentElement.dataset.renderMode="lite";
    await import("./lite.js?v=20260921-compat8");
  }
};
load();
