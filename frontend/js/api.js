(function () {
  function base() {
    return (window.CEA_API_BASE || window.__API_BASE__ || '').replace(/\/+$/, '');
  }

  async function req(method, path, data) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (data !== undefined) opts.body = JSON.stringify(data);

    const r = await fetch(base() + path, opts);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || 'Error ' + r.status);
    }

    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) return r.json();
    if (ct.includes('application/pdf'))  return r.blob();
    return r.text();
  }

  // Petición PDF con Accept: application/pdf para que API Gateway
  // decodifique el base64 antes de enviarlo al cliente.
  async function reqPdf(path) {
    const r = await fetch(base() + path, {
      method: 'GET',
      headers: { 'Accept': 'application/pdf' },
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || 'Error ' + r.status);
    }
    return r.blob();
  }

  // Abre el PDF en nueva pestaña (blob URL desde HTTPS no tiene
  // el problema de file:// que aparecía al descargar a disco).
  function openPdf(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    // Sin atributo download → el navegador abre el visor en lugar de descargar
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Mantener el blob URL vivo 2 min para que el visor cargue el PDF
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }

  window.API = {
    get:  (path)        => req('GET',    path),
    post: (path, data)  => req('POST',   path, data),
    put:  (path, data)  => req('PUT',    path, data),
    del:  (path)        => req('DELETE', path),
    async pdf(path, filename) {
      const blob = await reqPdf(path);
      openPdf(blob, filename);
    },
  };
})();
