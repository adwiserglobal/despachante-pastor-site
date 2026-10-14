/* Validação de entrada do questionário. As conferências não substituem a verificação documental. */
(function(root) {
  'use strict';
  const dateFields = new Set([
    'birth_date','father_birth_date','mother_birth_date','passport_issue_date',
    'passport_expiry_date','arrival_date','last_us_arrival','previous_visa_issue_date',
    'previous_job_start','previous_job_end','spouse_birth_date','employment_start','employment_end','course_start','course_end','ex_spouse_birth_date','marriage_date','divorce_date'
  ]);
  const birthFields = new Set(['birth_date','father_birth_date','mother_birth_date','spouse_birth_date','ex_spouse_birth_date']);
  const pastFields = new Set([
    ...birthFields,'passport_issue_date','last_us_arrival',
    'previous_visa_issue_date','previous_job_start','previous_job_end','employment_start','employment_end','course_start',
    'marriage_date','divorce_date'
  ]);
  const phoneFields = new Set(['primary_phone','secondary_phone','business_phone','payer_phone','employer_phone']);

  function digits(value) {
    return String(value == null ? '' : value).replace(/\D/g, '');
  }
  function formatCpf(value) {
    const s = digits(value).slice(0,11);
    return s.slice(0,3) + (s.length>3 ? '.'+s.slice(3,6) : '')
      + (s.length>6 ? '.'+s.slice(6,9) : '') + (s.length>9 ? '-'+s.slice(9) : '');
  }
  function validCpf(value) {
    const s=digits(value);
    if(s.length!==11 || /^(\d)\1{10}$/.test(s))return false;
    function check(length) {
      let sum=0;
      for(let i=0;i<length;i++)sum+=Number(s[i])*(length+1-i);
      const remainder=(sum*10)%11;
      return Number(s[length])===(remainder===10?0:remainder);
    }
    return check(9)&&check(10);
  }
  function formatDate(value) {
    const s=digits(value).slice(0,8);
    return s.slice(0,2)+(s.length>2?'/'+s.slice(2,4):'')+(s.length>4?'/'+s.slice(4,8):'');
  }
  function parseDate(value) {
    const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value||''));
    if(!match)return null;
    const [,day,month,year]=match.map(Number);
    if(year<1850||year>2200)return null;
    const d=new Date(year,month-1,day);
    if(d.getFullYear()!==year || d.getMonth()!==month-1 || d.getDate()!==day)return null;
    d.setHours(0,0,0,0);
    return d;
  }
  function startOfToday() {
    const now=new Date();now.setHours(0,0,0,0);return now;
  }
  function validDate(name,value,data={},today=startOfToday()) {
    if(value==null || value==='')return '';
    const parsed=parseDate(value);
    if(!parsed)return 'Informe uma data real no formato DD/MM/AAAA.';
    const minYear=birthFields.has(name)?1850:1900;
    if(parsed.getFullYear()<minYear)return 'Verifique o ano informado.';
    if(pastFields.has(name)&&parsed>today)return 'Esta data não pode estar no futuro.';
    if(birthFields.has(name)){
      const age=today.getFullYear()-parsed.getFullYear()-
        (today.getMonth()<parsed.getMonth() || (today.getMonth()===parsed.getMonth()&&today.getDate()<parsed.getDate())?1:0);
      if(age>(name==='birth_date'?125:140))return 'Verifique o ano de nascimento informado.';
    }
    if(name==='arrival_date') {
      const max=new Date(today.getFullYear()+10,today.getMonth(),today.getDate());
      if(parsed<today)return 'A chegada prevista não pode estar no passado.';
      if(parsed>max)return 'A chegada prevista está muito distante. Verifique o ano.';
    }
    if(name==='course_end'){
      const max=new Date(today.getFullYear()+10,today.getMonth(),today.getDate());
      if(parsed>max)return 'Verifique o ano previsto para o término do curso.';
    }
    if(name==='passport_expiry_date'){
      const max=new Date(today.getFullYear()+20,today.getMonth(),today.getDate());
      if(parsed<today)return 'A validade do passaporte está vencida. Confira o documento.';
      if(parsed>max)return 'Verifique o ano de validade do passaporte.';
    }
    if(name==='passport_expiry_date' && data.passport_issue_date) {
      const issue=parseDate(data.passport_issue_date);
      if(issue && parsed<=issue)return 'A validade deve ser posterior à emissão do passaporte.';
    }
    if(name==='passport_issue_date'&&data.passport_expiry_date){
      const expiry=parseDate(data.passport_expiry_date);
      if(expiry && parsed>=expiry)return 'A emissão deve ser anterior à validade do passaporte.';
    }
    if(name==='course_end' && data.course_start){
      const courseStart=parseDate(data.course_start);
      if(courseStart && parsed<courseStart)return 'O término do curso não pode ser anterior ao início.';
    }
    if(name==='employment_end' && data.employment_start){
      const jobStart=parseDate(data.employment_start);
      if(jobStart && parsed<jobStart)return 'A saída do emprego não pode ser anterior à admissão.';
    }
    if(name==='previous_job_end' && data.previous_job_start){
      const start=parseDate(data.previous_job_start);
      if(start && parsed<start)return 'O desligamento não pode ser anterior à admissão.';
    }
    if(name==='previous_job_start'&&data.previous_job_end){
      const end=parseDate(data.previous_job_end);
      if(end && parsed>end)return 'A admissão não pode ser posterior ao desligamento.';
    }
    if(name==='divorce_date' && data.marriage_date){
      const m=parseDate(data.marriage_date);
      if(m && parsed<=m)return 'O divórcio deve ser posterior à data do casamento.';
    }
    if(name==='marriage_date' && data.divorce_date){
      const dv=parseDate(data.divorce_date);
      if(dv && parsed>=dv)return 'O casamento deve ser anterior à data do divórcio.';
    }
    if(name==='marriage_date' && data.birth_date){
      const b=parseDate(data.birth_date);
      if(b && parsed<=b)return 'A data do casamento deve ser posterior ao seu nascimento.';
    }
    return '';
  }

  function formatPhone(value) {
    const raw=String(value||'');
    const s=digits(raw).slice(0,15);
    if(!s)return '';
    if(raw.trim().startsWith('+')||s.length>11)return '+'+s;
    if(s.length<3)return '('+s;
    return '('+s.slice(0,2)+') '+s.slice(2,s.length>10?7:6)
      +(s.length>(s.length>10?7:6)?'-'+s.slice(s.length>10?7:6):'');
  }
  function formatSsn(value) {
    const s=digits(value).slice(0,9);
    return s.slice(0,3)+(s.length>3?'-'+s.slice(3,5):'')+(s.length>5?'-'+s.slice(5):'');
  }
  function formatRg(value) {
    return String(value||'').toUpperCase().replace(/[^0-9X.\-]/g,'').slice(0,14);
  }
  function formatMoney(value) {
    const raw=String(value||'').replace(/[^\d,]/g,'');
    const parts=raw.split(',');
    const int=parts[0].replace(/^0+(?=\d)/,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    return parts.length>1?int+','+parts.slice(1).join('').slice(0,2):int;
  }
  function formatCnpj(value) {
    const s=digits(value).slice(0,14);
    return s.slice(0,2)+(s.length>2?'.'+s.slice(2,5):'')+(s.length>5?'.'+s.slice(5,8):'')
      +(s.length>8?'/'+s.slice(8,12):'')+(s.length>12?'-'+s.slice(12):'');
  }
  function validCnpj(value) {
    const s=digits(value);
    if(s.length!==14||/^(\d)\1{13}$/.test(s))return false;
    function check(length) {
      const weights=length===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2];
      let sum=0;
      for(let i=0;i<length;i++)sum+=Number(s[i])*weights[i];
      const r=sum%11;
      return Number(s[length])===(r<2?0:11-r);
    }
    return check(12)&&check(13);
  }
  // Campo de empregador aceita nome ou CNPJ: só trata como CNPJ se tiver apenas dígitos e pontuação
  function looksLikeCnpj(value) {
    return /^[\d./\-\s]+$/.test(String(value||'')) && /\d/.test(String(value||''));
  }
  function validate(field,value,data={}) {
    const name=field.name;
    const v=typeof value==='string'?value.trim():value;
    if(field.required && (v===''||v==null||v===false)){
      return field.type==='file'?'Anexe o documento obrigatório.':'Este campo é obrigatório.';
    }
    if(v==null||v==='')return '';
    if(dateFields.has(name))return validDate(name,v,data);
    if(name==='cpf'&&!validCpf(v))return 'CPF inválido. Confira os 11 dígitos verificadores.';
    if(phoneFields.has(name)) {
      const s=digits(v);
      if(s.length<10||s.length>15)return 'Informe um telefone válido, com DDD ou código do país.';
      if(name==='primary_phone' && !/^(?:55)?[1-9][0-9]\d{8,9}$/.test(s))
        return 'Informe um telefone brasileiro com DDD válido.';
    }
    if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
      return 'Informe um endereço de e-mail válido.';
    if(name==='passport_number'&&!/^[\p{L}\p{N} .-]{5,24}$/u.test(v))
      return 'Confira o número do passaporte conforme o documento.';
    if(name==='us_ssn'){
      const s=digits(v);
      if(s.length!==9)return 'O número de seguro social dos EUA deve ter 9 dígitos.';
      if(/^(000|666|9)/.test(s)||s.slice(3,5)==='00'||s.slice(5)==='0000')return 'Número de seguro social inválido. Confira os dígitos.';
    }
    if(name==='rg' && !/^[0-9X.\-]{5,14}$/.test(v))return 'Informe o RG somente com números (e X, se houver).';
    if(name==='rg' && digits(v).length<5)return 'O RG deve ter ao menos 5 dígitos.';
    if(name==='previous_visa_number' && !/^\d{8}$/.test(v))return 'O número do visto deve ter 8 dígitos, somente números.';
    if(name==='employer_school' && looksLikeCnpj(v) && !validCnpj(v))return 'CNPJ inválido. Confira os 14 dígitos ou informe o nome da empresa.';
    if(name==='monthly_income'){
      if(!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(v))return 'Informe um valor numérico em reais, por exemplo 5.000,00.';
      if(Number(v.replace(/\./g,'').replace(',','.'))<=0)return 'A renda mensal deve ser maior que zero.';
    }
    return '';
  }
  function format(name,value) {
    if(name==='cpf')return formatCpf(value);
    if(dateFields.has(name))return formatDate(value);
    if(phoneFields.has(name))return formatPhone(value);
    if(name==='us_ssn')return formatSsn(value);
    if(name==='rg')return formatRg(value);
    if(name==='monthly_income')return formatMoney(value);
    if(name==='previous_visa_number')return digits(value).slice(0,8);
    if(name==='employer_school')return looksLikeCnpj(value)?formatCnpj(value):value;
    if(name==='passport_number')return String(value||'').toUpperCase().replace(/[^\p{L}\p{N} .-]/gu,'').slice(0,24);
    return value;
  }
  root.VisaValidation={validate,validCpf,parseDate,formatDate,formatCpf,formatPhone,format,dateFields,validDate};
})(typeof window!=='undefined'?window:globalThis);
