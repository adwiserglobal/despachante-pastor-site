/* Validação de entrada do questionário. As conferências não substituem a verificação documental. */
(function(root) {
  'use strict';
  const dateFields = new Set([
    'birth_date','father_birth_date','mother_birth_date','passport_issue_date',
    'passport_expiry_date','arrival_date','last_us_arrival','previous_visa_issue_date',
    'previous_job_start','previous_job_end'
  ]);
  const birthFields = new Set(['birth_date','father_birth_date','mother_birth_date']);
  const pastFields = new Set([
    ...birthFields,'passport_issue_date','last_us_arrival',
    'previous_visa_issue_date','previous_job_start','previous_job_end'
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
    if(name==='previous_job_end' && data.previous_job_start){
      const start=parseDate(data.previous_job_start);
      if(start && parsed<start)return 'O desligamento não pode ser anterior à admissão.';
    }
    if(name==='previous_job_start'&&data.previous_job_end){
      const end=parseDate(data.previous_job_end);
      if(end && parsed>end)return 'A admissão não pode ser posterior ao desligamento.';
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
    if(name==='us_ssn' && digits(v).length!==9)return 'O número de seguro social dos EUA deve ter 9 dígitos.';
    if(name==='monthly_income' && !/^[\d.,\sR$]+$/.test(v))
      return 'Informe um valor numérico em reais.';
    return '';
  }
  function format(name,value) {
    if(name==='cpf')return formatCpf(value);
    if(dateFields.has(name))return formatDate(value);
    if(phoneFields.has(name))return formatPhone(value);
    if(name==='passport_number')return String(value||'').toUpperCase().replace(/[^\p{L}\p{N} .-]/gu,'').slice(0,24);
    return value;
  }
  root.VisaValidation={validate,validCpf,parseDate,formatDate,formatCpf,formatPhone,format,dateFields,validDate};
})(typeof window!=='undefined'?window:globalThis);
