(function(){
  if(window.__SF_CHAT_LOADED__) return;
  window.__SF_CHAT_LOADED__=true;

  var css=document.createElement('link');
  css.rel='stylesheet'; css.href='/chat/widget.css?v=1';
  document.head.appendChild(css);

  var sid=localStorage.getItem('sfchat_sid');
  if(!sid){sid='sf_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);localStorage.setItem('sfchat_sid',sid);}
  var lead=JSON.parse(localStorage.getItem('sfchat_lead')||'null');

  var wrap=document.createElement('div');
  wrap.innerHTML='<button id="sfchat-launcher" aria-label="Chat with Superfab">💬</button>'+
  '<section id="sfchat-panel" aria-label="Superfab chat">'+
    '<div class="sfchat-head"><div><strong>Chat with Superfab</strong><div class="sfchat-sub">Ask us about our products and capabilities</div></div><button class="sfchat-close" aria-label="Close">×</button></div>'+
    '<div id="sfchat-messages"><div class="sfchat-msg sfchat-bot">Hello! I can help with information available on the Superfab website. Please share your name and mobile number to begin.</div></div>'+
    '<div id="sfchat-lead"><input id="sfchat-name" placeholder="Your name" autocomplete="name"><input id="sfchat-mobile" placeholder="Mobile number" inputmode="tel" autocomplete="tel"><button class="sfchat-btn" id="sfchat-start">Start Chat</button><div class="sfchat-note">Your details and chat are saved so our team can assist you.</div></div>'+
    '<form id="sfchat-form"><input id="sfchat-q" placeholder="Type your question…" autocomplete="off"><button type="submit">Send</button></form>'+
  '</section>';
  document.body.appendChild(wrap);

  var panel=document.getElementById('sfchat-panel'), launcher=document.getElementById('sfchat-launcher'), close=document.querySelector('.sfchat-close'), msgs=document.getElementById('sfchat-messages'), leadBox=document.getElementById('sfchat-lead'), form=document.getElementById('sfchat-form'), q=document.getElementById('sfchat-q');

  function add(text,who){var d=document.createElement('div');d.className='sfchat-msg '+(who==='user'?'sfchat-user':'sfchat-bot');d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;}
  function ready(){leadBox.style.display='none';form.classList.add('sf-ready');}
  if(lead&&lead.name&&lead.mobile) ready();

  launcher.onclick=function(){panel.classList.toggle('sf-open');if(panel.classList.contains('sf-open')&&lead)q.focus();};
  close.onclick=function(){panel.classList.remove('sf-open');};

  document.getElementById('sfchat-start').onclick=async function(){
    var name=document.getElementById('sfchat-name').value.trim();
    var mobile=document.getElementById('sfchat-mobile').value.replace(/[^0-9+]/g,'').trim();
    if(name.length<2){alert('Please enter your name.');return;}
    if(mobile.replace(/\D/g,'').length<8){alert('Please enter a valid mobile number.');return;}
    this.disabled=true; this.textContent='Please wait…';
    try{
      var r=await fetch('/chat/api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',session_id:sid,name:name,mobile:mobile,source_url:location.href})});
      var j=await r.json(); if(!j.ok) throw new Error(j.error||'Unable to start chat');
      lead={name:name,mobile:mobile};localStorage.setItem('sfchat_lead',JSON.stringify(lead));ready();q.focus();
    }catch(e){alert('Unable to start chat right now. Please try again.');}
    finally{this.disabled=false;this.textContent='Start Chat';}
  };

  form.onsubmit=async function(e){
    e.preventDefault(); var question=q.value.trim(); if(!question)return;
    add(question,'user'); q.value=''; q.disabled=true;
    var thinking=document.createElement('div');thinking.className='sfchat-msg sfchat-bot';thinking.textContent='Typing…';msgs.appendChild(thinking);msgs.scrollTop=msgs.scrollHeight;
    try{
      var r=await fetch('/chat/api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ask',session_id:sid,question:question,source_url:location.href})});
      var j=await r.json();thinking.remove();add(j.reply||'Thank you for your enquiry. Our team will get back to you shortly.','bot');
    }catch(err){thinking.remove();add('Thank you for your enquiry. Our team will get back to you shortly.','bot');}
    finally{q.disabled=false;q.focus();}
  };
})();