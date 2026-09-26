import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, getDocs, getDoc, setDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCb_VRWRTmAzNm-06Gw11dfWH4wpr8RdIE',
  authDomain: 'site-de-vendas-if.firebaseapp.com',
  projectId: 'site-de-vendas-if',
  messagingSenderId: '757213231345',
  appId: '1:757213231345:web:6810fe1d201a913f22d150',
  measurementId: 'G-1B5EFF07JD'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
if (await isSupported()) getAnalytics(app);

const seedProducts = [
  { id: 'seed-1', name: 'Fone Bluetooth Pulse', category: 'Eletrônicos', price: 89.9, description: 'Som potente, bateria ótima e pouco uso.', owner: 'Marina S.', ownerId: 'seed-user', icon: '◖◗', color: 'color-1', createdAt: '2026-09-20T10:00:00.000Z' },
  { id: 'seed-2', name: 'Câmera Analógica Vintage', category: 'Eletrônicos', price: 320, description: 'Uma câmera charmosa para quem ama fotografia.', owner: 'Rafael M.', ownerId: 'seed-user', icon: '●', color: 'color-2', createdAt: '2026-09-19T10:00:00.000Z' },
  { id: 'seed-3', name: 'Luminária de Mesa', category: 'Casa', price: 75, description: 'Luz quente e design que combina com qualquer mesa.', owner: 'Bia C.', ownerId: 'seed-user', icon: '✦', color: 'color-3', createdAt: '2026-09-18T10:00:00.000Z' },
  { id: 'seed-4', name: 'Tênis Street Run', category: 'Roupas', price: 149.9, description: 'Confortável, estiloso e pronto para novas caminhadas.', owner: 'Lucas P.', ownerId: 'seed-user', icon: '◒', color: '', createdAt: '2026-09-17T10:00:00.000Z' },
  { id: 'seed-5', name: 'Box de Livros de Design', category: 'Livros', price: 110, description: 'Três títulos para inspirar seus próximos projetos.', owner: 'Nina A.', ownerId: 'seed-user', icon: '▤', color: 'color-2', createdAt: '2026-09-16T10:00:00.000Z' },
  { id: 'seed-6', name: 'Mochila para trilha', category: 'Esportes', price: 180, description: 'Resistente, espaçosa e pronta para o fim de semana.', owner: 'Pedro R.', ownerId: 'seed-user', icon: '◓', color: 'color-1', createdAt: '2026-09-15T10:00:00.000Z' },
  { id: 'seed-7', name: 'Cadeira de leitura', category: 'Casa', price: 260, description: 'Conforto para pausas longas e boas histórias.', owner: 'Ana V.', ownerId: 'seed-user', icon: '⌂', color: 'color-3', createdAt: '2026-09-14T10:00:00.000Z' },
  { id: 'seed-8', name: 'Skate clássico', category: 'Esportes', price: 130, description: 'Prancha em ótimo estado para começar a andar.', owner: 'Gui T.', ownerId: 'seed-user', icon: '—', color: '', createdAt: '2026-09-13T10:00:00.000Z' }
];

const $ = (selector) => document.querySelector(selector);
const formatPrice = (price) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
let products = [];
let session = null;
let activeCategory = 'Todos';
let authMode = 'login';
let toastTimer;
let cart = JSON.parse(localStorage.getItem('vitrine_if_cart') || '[]');
let retainedImage = '';
let selectedImageFile = null;
let imagePreviewUrl = '';
const maxProductPhotoBytes = 450 * 1024;

function showFirebaseError(error) {
  const messages = { 'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/email-already-in-use': 'Este e-mail já está cadastrado.', 'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.', 'auth/invalid-email': 'Digite um e-mail válido.' };
  return messages[error.code] || 'Não foi possível concluir. Verifique sua conexão e tente novamente.';
}

async function loadProducts() {
  const snapshot = await getDocs(collection(db, 'products'));
  products = snapshot.empty ? [] : snapshot.docs.map((item) => ({ id: item.id, ...item.data(), createdAt: item.data().createdAt?.toDate?.()?.toISOString() || item.data().createdAt || new Date().toISOString() }));
  renderProducts();
}

async function loadUserProfile(firebaseUser) {
  const profile = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (!profile.exists()) {
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      name: firebaseUser.email.split('@')[0],
      email: firebaseUser.email,
      role: 'user',
      createdAt: serverTimestamp()
    });
  }
  const data = profile.exists() ? profile.data() : { name: firebaseUser.email.split('@')[0], role: 'user' };
  session = { id: firebaseUser.uid, email: firebaseUser.email, name: data.name || firebaseUser.email.split('@')[0], storeName: data.storeName || data.name || firebaseUser.email.split('@')[0], role: data.role || 'user' };
  updateHeader();
  renderProducts();
}

function renderProducts() {
  const query = $('#searchInput').value.trim().toLowerCase();
  const sort = $('#sortSelect').value;
  let visible = products.filter((product) => (activeCategory === 'Todos' || product.category === activeCategory) && (!query || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query)));
  if (sort === 'cheap') visible.sort((a, b) => a.price - b.price);
  if (sort === 'expensive') visible.sort((a, b) => b.price - a.price);
  if (sort === 'recent') visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  $('#allCount').textContent = products.length;
  $('#productGrid').innerHTML = visible.map(productCard).join('');
  $('#emptyState').classList.toggle('hidden', visible.length > 0);
  document.querySelectorAll('.favorite').forEach((button) => button.addEventListener('click', () => button.classList.toggle('active')));
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => openProductModal(button.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteProduct(button.dataset.delete)));
  document.querySelectorAll('[data-cart]').forEach((button) => button.addEventListener('click', () => addToCart(button.dataset.cart)));
  renderCart();
}

function productCard(product) {
  const canManage = session && (session.role === 'admin' || session.id === product.ownerId);
  const images = productImages(product);
  const image = images.length ? `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name)}">` : `<span>${escapeHtml(product.icon || '✦')}</span>`;
  return `<article class="product-tile"><div class="product-image ${product.color || ''}">${image}</div><button class="favorite" type="button" aria-label="Favoritar ${escapeHtml(product.name)}">♡</button><span class="product-category">${escapeHtml(product.category)}</span><strong class="product-name" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</strong><details class="product-description"><summary>Ver descrição</summary><p>${escapeHtml(product.description)}</p></details><div class="product-meta"><span class="product-price">${formatPrice(product.price)}</span><span class="product-owner">por ${escapeHtml(product.owner)}</span></div><button class="add-cart-button" data-cart="${product.id}" type="button">Adicionar ao carrinho</button>${canManage ? `<div class="product-actions"><button class="small-action" data-edit="${product.id}" type="button">Editar</button><button class="small-action delete" data-delete="${product.id}" type="button">Apagar</button></div>` : ''}</article>`;
}

function productImages(product) { const image = Object.prototype.hasOwnProperty.call(product, 'image') ? product.image : product.images?.[0]; return image ? [image] : []; }

function renderImagePreview() {
  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  imagePreviewUrl = selectedImageFile ? URL.createObjectURL(selectedImageFile) : '';
  const image = imagePreviewUrl || retainedImage;
  $('#productImagePreview').innerHTML = image ? `<div class="image-preview"><img src="${escapeHtml(image)}" alt="Foto do produto"><button type="button" data-remove-product-image aria-label="Remover foto">×</button></div>` : '';
  $('#imageSelectionCount').textContent = image ? '1 foto selecionada' : 'Nenhuma foto selecionada';
}

async function compressProductPhoto(file) {
  const bitmap = 'createImageBitmap' in window ? await createImageBitmap(file) : await new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível abrir a foto.')); };
    image.src = url;
  });
  const canvas = document.createElement('canvas');
  let scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
  let quality = 0.78;
  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (!blob) throw new Error('Não foi possível converter a foto.');
      if (blob.size <= maxProductPhotoBytes) {
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      }
      if (quality > 0.5) quality -= 0.1;
      else { scale *= 0.8; quality = 0.78; }
    }
    throw new Error('A foto não pôde ser reduzida o suficiente para salvar.');
  } finally {
    bitmap.close?.();
    canvas.width = 0;
    canvas.height = 0;
  }
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character])); }

function updateHeader() {
  const loggedIn = Boolean(session);
  $('#loginButton').classList.toggle('hidden', loggedIn);
  $('#sellButton').classList.toggle('hidden', !loggedIn);
  $('#profileButton').classList.toggle('hidden', !loggedIn);
  if (loggedIn) $('#profileInitial').textContent = session.storeName.charAt(0).toUpperCase();
}

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000); }
function openAuth(mode = 'login') { authMode = mode; $('#modalTitle').textContent = mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'; $('#modalSubtitle').textContent = mode === 'login' ? 'Publique produtos e gerencie seus anúncios.' : 'Leva menos de um minuto para começar a anunciar.'; $('#authSubmit').textContent = mode === 'login' ? 'Entrar' : 'Criar conta'; $('#authSwitch').textContent = mode === 'login' ? 'Ainda não tenho uma conta' : 'Já tenho uma conta'; $('#registerStoreField').classList.toggle('hidden', mode !== 'register'); $('#authError').textContent = ''; $('#authForm').reset(); $('#modalBackdrop').classList.remove('hidden'); $('#emailInput').focus(); }
function closeAuth() { $('#modalBackdrop').classList.add('hidden'); }
function openProductModal(productId = '') { if (!session) return openAuth('login'); const product = products.find((item) => item.id === productId); $('#productForm').reset(); $('#productError').textContent = ''; $('#productIdInput').value = product?.id || ''; $('#productModalTitle').textContent = product ? 'Edite seu produto' : 'Anuncie um produto'; retainedImage = product ? productImages(product)[0] || '' : ''; selectedImageFile = null; if (product) { $('#productNameInput').value = product.name; $('#productPriceInput').value = product.price; $('#productCategoryInput').value = product.category; $('#productDescriptionInput').value = product.description; $('#productPhoneInput').value = product.phone || ''; } renderImagePreview(); $('#productModalBackdrop').classList.remove('hidden'); $('#productNameInput').focus(); }
function closeProductModal() { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); imagePreviewUrl = ''; $('#productModalBackdrop').classList.add('hidden'); }

function saveCart() { localStorage.setItem('vitrine_if_cart', JSON.stringify(cart)); }
function addToCart(productId) { const product = products.find((item) => item.id === productId); if (!product) return; const existing = cart.find((item) => item.id === productId); if (existing) existing.quantity += 1; else cart.push({ id: product.id, name: product.name, price: product.price, owner: product.owner, phone: product.phone || '', quantity: 1 }); saveCart(); renderCart(); showToast(`${product.name} foi adicionado ao carrinho.`); }
function removeFromCart(productId) { cart = cart.filter((item) => item.id !== productId); saveCart(); renderCart(); }
function renderCart() { $('#cartCount').textContent = cart.reduce((total, item) => total + item.quantity, 0); $('#cartTotal').textContent = formatPrice(cart.reduce((total, item) => total + item.price * item.quantity, 0)); $('#cartItems').innerHTML = cart.length ? cart.map((item) => `<div class="cart-item"><div><strong>${escapeHtml(item.name)}</strong><span>${item.quantity} × ${formatPrice(item.price)}</span><small>Vendedor: ${escapeHtml(item.owner)}</small></div><button type="button" data-remove-cart="${item.id}" aria-label="Remover ${escapeHtml(item.name)}">×</button></div>`).join('') : '<div class="cart-empty"><span>🛒</span><p>Seu carrinho está vazio.</p><small>Adicione produtos para montar seu pedido.</small></div>'; document.querySelectorAll('[data-remove-cart]').forEach((button) => button.addEventListener('click', () => removeFromCart(button.dataset.removeCart))); }
function openCart() { $('#cartDrawer').classList.add('open'); }
function closeCart() { $('#cartDrawer').classList.remove('open'); }
function checkoutCart() { if (!cart.length) return showToast('Adicione algum produto ao carrinho primeiro.'); const missingPhone = cart.find((item) => !item.phone); if (missingPhone) return showToast(`O vendedor de "${missingPhone.name}" ainda não informou um telefone.`); const grouped = cart.reduce((groups, item) => { const key = item.phone.replace(/\D/g, ''); groups[key] ||= { phone: key, owner: item.owner, items: [] }; groups[key].items.push(item); return groups; }, {}); Object.values(grouped).forEach((group) => { const text = `Olá, ${group.owner}! Gostaria de fazer este pedido:\n${group.items.map((item) => `- ${item.quantity}x ${item.name} (${formatPrice(item.price * item.quantity)})`).join('\n')}\nTotal: ${formatPrice(group.items.reduce((total, item) => total + item.price * item.quantity, 0))}`; window.open(`https://wa.me/55${group.phone}?text=${encodeURIComponent(text)}`, '_blank'); }); }

$('#authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('#emailInput').value.trim().toLowerCase();
  const password = $('#passwordInput').value;
  $('#authError').textContent = '';
  try {
    if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
    else { const result = await createUserWithEmailAndPassword(auth, email, password); const name = email.split('@')[0]; await setDoc(doc(db, 'users', result.user.uid), { name, storeName: $('#registerStoreInput').value.trim() || name, email, role: 'user', createdAt: serverTimestamp() }); }
    closeAuth(); showToast(authMode === 'login' ? 'Login realizado com sucesso.' : 'Conta criada. Agora você já pode anunciar!');
  } catch (error) { $('#authError').textContent = showFirebaseError(error); }
});

$('#productForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = $('#productIdInput').value;
  const data = { name: $('#productNameInput').value.trim(), price: Number($('#productPriceInput').value), category: $('#productCategoryInput').value, description: $('#productDescriptionInput').value.trim(), phone: $('#productPhoneInput').value.trim() };
  $('#productError').textContent = '';
  if (!data.name || !data.description || !data.phone || !Number.isFinite(data.price)) return $('#productError').textContent = 'Preencha todos os campos obrigatórios, incluindo o telefone.';
  const submitButton = $('#productForm button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Salvando anúncio...';
  try {
    const productId = id || doc(collection(db, 'products')).id;
    data.image = selectedImageFile ? await compressProductPhoto(selectedImageFile) : retainedImage;
    const productData = { ...data };
    if (id) await updateDoc(doc(db, 'products', id), productData);
    else await setDoc(doc(db, 'products', productId), { ...productData, owner: session.storeName, ownerId: session.id, icon: '✦', color: `color-${(products.length % 3) + 1}`, createdAt: serverTimestamp() });
    closeProductModal();
    await loadProducts();
    showToast(id ? 'Produto atualizado com sucesso.' : 'Produto publicado na vitrine!');
  } catch (error) {
    console.error('Falha ao salvar anúncio ou enviar fotos:', error);
    $('#productError').textContent = error.code === 'firestore/permission-denied' ? 'O Firestore recusou salvar o anúncio. Confira as regras do Firestore.' : error.message || 'Não foi possível salvar o anúncio. Tente novamente.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = id ? 'Salvar alterações' : 'Publicar produto';
  }
});

$('#storeForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const storeName = $('#storeNameInput').value.trim();
  $('#storeError').textContent = '';
  if (!storeName) return $('#storeError').textContent = 'Digite o nome da sua loja.';
  try {
    await updateDoc(doc(db, 'users', session.id), { storeName });
    const ownedProducts = await getDocs(query(collection(db, 'products'), where('ownerId', '==', session.id)));
    await Promise.all(ownedProducts.docs.map((product) => updateDoc(product.ref, { owner: storeName })));
    session.storeName = storeName;
    updateHeader();
    await loadProducts();
    $('#storeModalBackdrop').classList.add('hidden');
    showToast('Nome da loja atualizado.');
  } catch (error) {
    $('#storeError').textContent = 'Não foi possível salvar. Confira as regras do Firestore.';
  }
});

async function deleteProduct(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product || !session || (session.role !== 'admin' && session.id !== product.ownerId) || !window.confirm(`Apagar o anúncio "${product.name}"?`)) return;
  try { await deleteDoc(doc(db, 'products', productId)); await loadProducts(); showToast('Anúncio removido.'); } catch (error) { showToast('Sem permissão para apagar este anúncio.'); }
}

$('#loginButton').addEventListener('click', () => openAuth('login'));
$('#sellButton').addEventListener('click', () => openProductModal());
$('#cartButton').addEventListener('click', openCart); $('#cartClose').addEventListener('click', closeCart); $('#checkoutButton').addEventListener('click', checkoutCart);
$('#profileButton').addEventListener('click', () => { $('#storeNameInput').value = session.storeName; $('#storeError').textContent = ''; $('#storeModalBackdrop').classList.remove('hidden'); $('#storeNameInput').focus(); });
$('#logoutButton').addEventListener('click', async () => { await signOut(auth); $('#storeModalBackdrop').classList.add('hidden'); });
$('#authSwitch').addEventListener('click', () => openAuth(authMode === 'login' ? 'register' : 'login'));
$('#modalClose').addEventListener('click', closeAuth); $('#productModalClose').addEventListener('click', closeProductModal);
$('#productImageInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) $('#productError').textContent = 'Selecione um arquivo de imagem.';
  else if (file.size > 15 * 1024 * 1024) $('#productError').textContent = 'A foto original deve ter no máximo 15 MB.';
  else { $('#productError').textContent = ''; selectedImageFile = file; retainedImage = ''; renderImagePreview(); }
  event.target.value = '';
});
$('#productImagePreview').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-product-image]');
  if (!button) return;
  selectedImageFile = null;
  retainedImage = '';
  renderImagePreview();
});
$('#storeModalClose').addEventListener('click', () => $('#storeModalBackdrop').classList.add('hidden'));
$('#modalBackdrop').addEventListener('click', (event) => { if (event.target === $('#modalBackdrop')) closeAuth(); });
$('#productModalBackdrop').addEventListener('click', (event) => { if (event.target === $('#productModalBackdrop')) closeProductModal(); });
$('#storeModalBackdrop').addEventListener('click', (event) => { if (event.target === $('#storeModalBackdrop')) $('#storeModalBackdrop').classList.add('hidden'); });
$('#searchButton').addEventListener('click', renderProducts); $('#searchInput').addEventListener('input', renderProducts); $('#sortSelect').addEventListener('change', renderProducts);
$('#categoryRow').addEventListener('click', (event) => { const button = event.target.closest('[data-category]'); if (!button) return; activeCategory = button.dataset.category; document.querySelectorAll('.category').forEach((item) => item.classList.toggle('active', item === button)); renderProducts(); });
document.querySelectorAll('[data-search]').forEach((button) => button.addEventListener('click', () => { $('#searchInput').value = button.dataset.search; renderProducts(); $('#catalogo').scrollIntoView({ behavior: 'smooth' }); }));
$('#clearFilters').addEventListener('click', () => { activeCategory = 'Todos'; $('#searchInput').value = ''; document.querySelectorAll('.category').forEach((item) => item.classList.toggle('active', item.dataset.category === 'Todos')); renderProducts(); });
$('#filterButton').addEventListener('click', () => showToast('Escolha uma categoria para filtrar a vitrine.'));

onAuthStateChanged(auth, async (firebaseUser) => { if (firebaseUser) await loadUserProfile(firebaseUser); else { session = null; updateHeader(); renderProducts(); } });
loadProducts().catch(() => { products = []; renderProducts(); showToast('Não foi possível carregar os produtos do Firebase.'); });
