(() => {
  'use strict';
  const text = (tag, value) => { const e=document.createElement(tag);e.textContent=value;return e; };
  function mount(host, data, {preview=false,onSuccess=()=>{},onBusy=()=>{}} = {}) {
    const settings=data.inquiry;
    if (!settings) {host.append(text('p','문의 안내 설정이 준비되지 않았습니다.'));return {};}
    const form=document.createElement('form');form.className='inquiry-form';form.setAttribute('aria-label','관리자 문의 접수');
    function field(label,name,type,max) {
      const wrapper=text('label',label);
      const input=document.createElement(type==='textarea'?'textarea':'input');
      if(type!=='textarea') input.type=type;
      input.name=name;input.required=true;input.maxLength=max;
      if(name==='name'||name==='email') input.autocomplete=name;
      if(type==='textarea') input.rows=4;
      wrapper.append(input);form.append(wrapper);return input;
    }
    const name=field('이름 (필수)','name','text',80);
    const email=field('답변받을 이메일 (필수)','email','email',254);
    const message=field('문의 내용 (필수, 최대 3,000자)','message','textarea',3000);
    const disclosure=text('p',`수집 주체: ${settings.controller}. 수집 항목: 이름, 이메일, 문의 내용 및 동의 일시. 목적: ${settings.purpose}. 보유 기간: 접수일로부터 ${settings.retentionDays}일. 동의를 거부할 수 있으며, 거부 시 문의 접수가 제한되는 양식입니다.`);
    disclosure.className='inquiry-privacy';
    const consentLabel=document.createElement('label');consentLabel.className='inquiry-consent';
    const consent=document.createElement('input');consent.type='checkbox';consent.required=true;consent.name='consent';
    consentLabel.append(consent,document.createTextNode('[필수] 개인정보 수집·이용에 동의합니다.'));
    const submit=text('button',preview?'미리보기에서는 접수할 수 없습니다':'문의 접수');submit.type='submit';submit.disabled=preview;
    const status=text('p','');status.className='inquiry-status';status.setAttribute('role','status');
    form.append(disclosure,consentLabel,submit,status);host.append(form);
    let busy=false,completed=false;
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(preview||busy||!form.reportValidity()||!consent.checked)return;
      if (![name,email,message].every(f=>f.value.trim())) {status.textContent='빈칸 없이 입력해 주시기 바랍니다.';return;}
      busy=true;submit.disabled=true;onBusy(true);status.textContent='접수 중입니다.';
      const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
      try {
        const response=await fetch('/api/inquiries',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.value.trim(),email:email.value.trim(),message:message.value.trim(),consent:consent.checked,version:data.version})});
        let result;try{result=await response.json();}catch{throw new Error('문의 서버에 연결하지 못했습니다. 서버 실행 상태를 확인해 주시기 바랍니다.');}
        if(!response.ok)throw new Error(result.error || '문의 접수에 실패했습니다.');
        form.reset();completed=true;status.textContent='문의 접수가 완료되었습니다. 접수번호는 '+result.id+'번입니다.';onSuccess(result.id);
      }catch(error){status.textContent=error.name==='AbortError'?'결과 확인 시간이 초과되었습니다. 중복 접수 전 관리자에게 확인해 주시기 바랍니다.':error.message;}
      finally{clearTimeout(timeout);busy=false;submit.disabled=false;onBusy(false);}
    });
    return {isBusy:()=>busy,isDirty:()=>!completed&&[name,email,message].some(f=>f.value)||consent.checked};
  }
  window.DashboardInquiry={mount};
  const host=document.querySelector('[data-inquiry-form]');
  if(host)fetch('/data/chatbot.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{
    if (!Object.values(data.nodes).some(n=>n.form==='inquiry')) {host.append(text('p','현재 문의 접수를 운영하지 않습니다.'));return;}
    mount(host,data);
  }).catch(()=>host.append(text('p','문의 안내를 불러오지 못했습니다. 잠시 후 다시 이용해 주시기 바랍니다.')));
})();
