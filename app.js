(function(){
  const DATASET = window.DATASET;
  let systemKey = null;
  let sexKey = null;

  const el = (id)=>document.getElementById(id);

  function setActivePick(){
    el('pickMetric').classList.toggle('active', systemKey==='metric');
    el('pickImperial').classList.toggle('active', systemKey==='imperial');
  }

  function resetAll(){
    systemKey=null; sexKey=null;
    setActivePick();
    ['btnMale','btnFemale','btnUnsure'].forEach(i=>el(i).disabled=true);
    el('panel').style.display='none';
    el('inputs').innerHTML='';
    el('results').innerHTML='';
    el('state').textContent='';
  }

  function setSystem(key){
    systemKey=key;
    setActivePick();
    sexKey=null;
    ['btnMale','btnFemale','btnUnsure'].forEach(i=>el(i).disabled=false);
    el('panel').style.display='none';
    el('inputs').innerHTML='';
    el('results').innerHTML='';
    el('state').textContent = (key==='metric') ? 'Metric' : 'Imperial';
  }

  function setSex(key){
    sexKey=key;
    buildInputs();
    el('panel').style.display='block';
    el('results').innerHTML='';
    el('state').textContent = (systemKey==='metric'?'Metric':'Imperial') + ' • ' + key;
  }

  function rangeLabel(r){ return r.min.toFixed(2) + '–' + r.max.toFixed(2) + ' mm'; }

  function buildSelect(id,label,options){
    const wrap=document.createElement('div');
    const lab=document.createElement('label'); lab.setAttribute('for',id); lab.textContent=label;
    const sel=document.createElement('select'); sel.id=id;
    const opt0=document.createElement('option'); opt0.value=''; opt0.textContent='Not sure';
    sel.appendChild(opt0);
    options.forEach(o=>{ const opt=document.createElement('option'); opt.value=o.value; opt.textContent=o.text; sel.appendChild(opt); });
    wrap.appendChild(lab); wrap.appendChild(sel);
    return wrap;
  }

  function uniqueBy(arr,keyFn){
    const seen=new Set(); const out=[];
    for(const item of arr){ const k=keyFn(item); if(!seen.has(k)){ seen.add(k); out.push(item);} }
    return out;
  }

  function buildRangeOption(measKey, entry){
    const r=entry.measurements[measKey];
    return { value: JSON.stringify({ key: measKey, min: r.min, max: r.max }), text: rangeLabel(r) };
  }

  // IMPORTANT CHANGE:
  // Imperial OD dropdown uses ONLY BSPT ranges (R sizes). This removes the second set (NPT) that looked like duplicates.
  function entriesForOD(){
    const entries = DATASET.systems[systemKey].entries;
    if(systemKey==='imperial') return entries.filter(e=>e.standard==='BSPT');
    return entries;
  }

  function buildInputs(){
    const inputs=el('inputs'); inputs.innerHTML='';
    const tol=DATASET.tolerancesMm;
    el('tol').textContent = '±' + tol.maleThreadOD + ' OD • ±' + tol.femaleOpeningID + ' opening • ±' + tol.maleBoreID + ' bore';

    const entries = DATASET.systems[systemKey].entries;
    const odEntries = entriesForOD();

    const odOptions = uniqueBy(odEntries.map(e=>buildRangeOption('maleThreadOD', e)), o=>o.text);
    const femaleOptions = uniqueBy(entries.map(e=>buildRangeOption('femaleOpeningID', e)), o=>o.text);
    const boreEntries = entries.filter(e=>e.measurements.maleBoreID);
    const boreOptions = uniqueBy(boreEntries.map(e=>buildRangeOption('maleBoreID', e)), o=>o.text);

    if(sexKey==='male'){
      inputs.appendChild(buildSelect('selOD','OD',odOptions));
      if(boreOptions.length) inputs.appendChild(buildSelect('selBore','Bore',boreOptions));
    } else if(sexKey==='female'){
      inputs.appendChild(buildSelect('selFemale','Opening',femaleOptions));
    } else {
      inputs.appendChild(buildSelect('selOD','OD',odOptions));
      if(boreOptions.length) inputs.appendChild(buildSelect('selBore','Bore',boreOptions));
      inputs.appendChild(buildSelect('selFemale','Opening',femaleOptions));
    }
  }

  function parseSel(val){ if(!val) return null; try{return JSON.parse(val);}catch{return null;} }
  function overlaps(aMin,aMax,bMin,bMax){ return Math.max(aMin,bMin) <= Math.min(aMax,bMax); }

  function scoreByOverlap(entry, selections){
    let used=0, score=0;
    for(const s of selections){
      used++;
      const r=entry.measurements[s.key];
      if(!r) continue;
      if(overlaps(r.min,r.max,s.min,s.max)) score++;
    }
    return {used, score};
  }

  function findMatches(){
    const entries=DATASET.systems[systemKey].entries;
    const selOD=el('selOD')?parseSel(el('selOD').value):null;
    const selBore=el('selBore')?parseSel(el('selBore').value):null;
    const selFemale=el('selFemale')?parseSel(el('selFemale').value):null;
    const selections=[selOD,selBore,selFemale].filter(Boolean);

    const out=el('results'); out.innerHTML='';
    if(!selections.length){ out.innerHTML='<div class="muted">Pick a range</div>'; return; }

    const scored = entries.map(e=>({ e, ...scoreByOverlap(e, selections) }))
      .filter(x=>x.used>0 && x.score>0)
      .sort((a,b)=>(b.score/b.used)-(a.score/a.used));

    if(!scored.length){ out.innerHTML='<div class="muted">No match</div>'; return; }

    const bestRatio = scored[0].score / scored[0].used;

    for(const s of scored){
      const ratio=s.score/s.used;
      const div=document.createElement('div'); div.className='result';
      const badge=(ratio===bestRatio)?'<span class="badge best">Best</span>':'<span class="badge alt">Close</span>';
      const label=(systemKey==='metric')? s.e.designation.split(' ')[0] : s.e.designation;
      const m=s.e.measurements;
      const bore=m.maleBoreID?('<div class="kv"><b>Bore</b><span>'+rangeLabel(m.maleBoreID)+'</span></div>'):'';
      div.innerHTML=
        '<div><b>'+label+'</b> '+badge+' <span class="muted">'+s.score+'/'+s.used+'</span></div>'+
        '<div class="kvs">'+
          '<div class="kv"><b>OD</b><span>'+rangeLabel(m.maleThreadOD)+'</span></div>'+
          '<div class="kv"><b>Opening</b><span>'+rangeLabel(m.femaleOpeningID)+'</span></div>'+
          bore+
        '</div>';
      out.appendChild(div);
    }
  }

  function clearSelections(){ ['selOD','selBore','selFemale'].forEach(id=>{ if(el(id)) el(id).value=''; }); el('results').innerHTML=''; }
  function wirePick(id,key){ const n=el(id); n.addEventListener('click',()=>setSystem(key)); n.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();setSystem(key);} }); }

  wirePick('pickMetric','metric');
  wirePick('pickImperial','imperial');
  el('btnMale').addEventListener('click',()=>setSex('male'));
  el('btnFemale').addEventListener('click',()=>setSex('female'));
  el('btnUnsure').addEventListener('click',()=>setSex('unsure'));
  el('btnFind').addEventListener('click',findMatches);
  el('btnClear').addEventListener('click',clearSelections);
  el('btnReset').addEventListener('click',resetAll);

  resetAll();
})();
