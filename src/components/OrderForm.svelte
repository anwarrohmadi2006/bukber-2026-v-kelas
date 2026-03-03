<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import {
    cart,
    userName,
    userNIM,
    studentNo,
    subTotal,
    subsidyApplied,
    finalTotalToPay,
    subsidyAmountStore,
    generateOrderPayload,
    resetOrder,
    existingOrderId,
    orderNote,
    fetchSubsidyAmount,
  } from "../lib/stores/cart";
  import {
    MENU_DATA,
    getBukberCategories,
    getRegularCategories,
    formatRupiah,
    type MenuItem,
  } from "../lib/data/menu";
  import CartBar from "./CartBar.svelte";
  import ItemModal from "./ItemModal.svelte";

  let { initialSubsidy = 30000 }: { initialSubsidy?: number } = $props();

  // Initialize seamlessly from SSR prop before the first paint
  // We use untrack to signal to Svelte 5 that capturing only the initial value is intentional
  subsidyAmountStore.set(untrack(() => initialSubsidy));

  const BASE_QRIS =
    "00020101021126610014COM.GO-JEK.WWW01189360091434963481800210G4963481800303UMI51440014ID.CO.QRIS.WWW0215ID10264841120850303UMI5204829953033605802ID5919HMPS Sains Data UIN6009SUKOHARJO61055716862070703A0163046730";

  onMount(() => {
    // Optionally refetch just in case it modified while user had page cached
    fetchSubsidyAmount();
  });

  let selectedItem = $state<MenuItem | null>(null);
  let isSubmitting = $state(false);

  // Edit order state
  let existingOrderToEdit = $state<any>(null);
  let isCheckingOrder = $state(false);

  const bukberCategories = getBukberCategories();
  const regularCategories = getRegularCategories();

  let studentCheckTimeout: ReturnType<typeof setTimeout>;

  // Watch NIM changes to lookup student
  $effect(() => {
    if ($userNIM.length >= 8) {
      clearTimeout(studentCheckTimeout);
      studentCheckTimeout = setTimeout(async () => {
        try {
          const res = await fetch(`/api/students?nim=${$userNIM}`);
          if (res.ok) {
            const student = await res.json();
            $userName = student.nama;
            $studentNo = student.no;
            if (!$existingOrderId) {
              checkExistingOrder($userNIM);
            }
          } else {
            $userName = "";
            $studentNo = 0;
            existingOrderToEdit = null;
          }
        } catch (e) {
          $userName = "";
          $studentNo = 0;
          existingOrderToEdit = null;
        }
      }, 500); // 500ms debounce
    } else {
      $userName = "";
      $studentNo = 0;
      existingOrderToEdit = null;
    }
  });

  async function checkExistingOrder(nim: string) {
    if (isCheckingOrder) return;
    isCheckingOrder = true;
    try {
      const res = await fetch(`/api/orders?nim=${nim}`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          existingOrderToEdit = data.orders[0];
        } else {
          existingOrderToEdit = null;
        }
      }
    } catch (e) {
      console.error("Failed to check existing order", e);
    } finally {
      isCheckingOrder = false;
    }
  }

  function loadExistingOrder() {
    if (existingOrderToEdit) {
      cart.setItems(existingOrderToEdit.items);
      $existingOrderId = existingOrderToEdit.id;
      $orderNote = existingOrderToEdit.note || "";
      existingOrderToEdit = null;
    }
  }

  function selectItem(item: MenuItem) {
    selectedItem = item;
  }

  function closeModal() {
    selectedItem = null;
  }

  async function handleCheckout() {
    if (!$userNIM.trim() || !$userName) {
      alert("Silakan masukkan NIM yang valid terlebih dahulu!");
      return;
    }

    isSubmitting = true;
    const payload = generateOrderPayload();

    try {
      const isEditing = !!$existingOrderId;
      const url = "/api/orders";
      const method = isEditing ? "PUT" : "POST";
      const bodyPayload = isEditing
        ? { ...payload, id: $existingOrderId }
        : payload;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to submit order");
      }

      const result = await response.json();

      const responseOrderId = isEditing ? $existingOrderId : result.id;

      existingOrderToEdit = null;
      resetOrder();

      // Redirect to dedicated payment page
      window.location.href = `/payment/${responseOrderId}`;
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Gagal mengirim pesanan. Silakan coba lagi.");
      isSubmitting = false;
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-b from-emerald-50 to-amber-50 pb-24">
  <!-- Header -->
  <header
    class="mesh-gradient text-white py-12 px-4 shadow-xl relative overflow-hidden"
  >
    <!-- Decorative Elements -->
    <div
      class="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
    >
      <div class="absolute top-10 left-10 text-4xl transform -rotate-12">
        🌟
      </div>
      <div class="absolute bottom-10 right-10 text-4xl transform rotate-12">
        🌙
      </div>
    </div>

    <div class="max-w-2xl mx-auto text-center relative z-10">
      <div
        class="inline-block mb-4 p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner"
      >
        <span class="text-5xl drop-shadow-lg">🌙</span>
      </div>

      <h1
        class="font-premium text-4xl md:text-5xl font-bold tracking-tight mb-2 drop-shadow-md"
      >
        Bukber <span class="text-amber-400 italic">2026</span>
      </h1>

      <div
        class="h-1 w-24 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-4"
      ></div>

      {#if $subsidyAmountStore > 0}
        <div
          class="transition-all duration-700 ease-in-out opacity-100 transform translate-y-0"
        >
          <p
            class="text-emerald-50 text-lg font-light max-w-md mx-auto leading-relaxed mb-6"
          >
            Rayakan kebersamaan di bulan suci dengan pilihan menu terbaik dari
            kami.
          </p>

          <div
            class="bg-gradient-to-r from-amber-500 to-amber-600 rounded-full px-6 py-2 inline-flex items-center gap-2 shadow-lg border border-amber-400/50 hover:scale-105 transition-transform cursor-default"
          >
            <span
              class="text-amber-950 font-bold text-sm tracking-wide uppercase"
              >Special Offer</span
            >
            <div class="w-1 h-1 rounded-full bg-amber-950/30"></div>
            <span class="text-white font-semibold"
              >Subsidi {formatRupiah($subsidyAmountStore)} per orang</span
            >
          </div>
        </div>
      {/if}
    </div>
  </header>

  <main class="max-w-2xl mx-auto px-4 py-6">
    <!-- Identitas Section -->
    <div
      class="bg-white rounded-2xl shadow-md p-6 mb-6 border border-emerald-100"
    >
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xl">🪪</span>
          <h2 class="text-lg font-bold text-gray-800">Identitas Pemesan</h2>
        </div>
        {#if $userNIM || $cart.length > 0}
          <button
            type="button"
            onclick={() => {
              if (confirm("Apakah kamu yakin ingin mereset form pesanan?"))
                resetOrder();
            }}
            class="text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors shadow-sm"
          >
            Reset Form
          </button>
        {/if}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            class="block text-sm font-semibold text-gray-700 mb-2"
            for="userNIM"
          >
            NIM Mahasiswa <span class="text-red-500">*</span>
          </label>
          <input
            id="userNIM"
            type="text"
            bind:value={$userNIM}
            placeholder="Contoh: 247411027"
            class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-emerald-500 focus:outline-none transition-colors font-mono"
            maxlength="10"
          />
          {#if existingOrderToEdit && !$existingOrderId}
            <div
              class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl relative overflow-hidden flex items-start sm:items-center justify-between gap-3 shadow-sm transition-all animate-fade-in-up group hover:shadow-md hover:border-blue-300"
            >
              <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
              <div class="pl-2">
                <p
                  class="text-xs font-semibold text-blue-800 flex items-center gap-1.5"
                >
                  <span class="text-base">📋</span> Pesanan Ditemukan!
                </p>
                <p
                  class="text-[11px] text-blue-600/90 mt-0.5 max-w-[200px] leading-tight font-medium"
                >
                  Kamu sudah pernah memesan paket bukber.
                </p>
              </div>
              <button
                type="button"
                onclick={loadExistingOrder}
                class="shrink-0 text-xs font-bold px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-transform focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-blue-50 active:scale-95 shadow-sm"
              >
                Edit Pesanan
              </button>
            </div>
          {/if}
          {#if $existingOrderId}
            <p
              class="mt-2 text-xs font-medium text-amber-600 flex items-center gap-1"
            >
              <span
                class="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"
              ></span>
              Mode Edit Pesanan Aktif
            </p>
          {/if}
        </div>

        <div>
          <label
            class="block text-sm font-semibold text-gray-700 mb-2"
            for="userName"
          >
            Nama Terdeteksi
          </label>
          <input
            id="userName"
            type="text"
            value={$userName}
            readonly
            placeholder="Masukkan NIM..."
            class="w-full px-4 py-3 rounded-xl border-2 border-gray-50 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
          />
        </div>
      </div>

      {#if $userNIM.length >= 8 && !$userName}
        <p class="text-red-500 text-xs mt-2 ml-1">
          NIM tidak terdaftar dalam database kelas.
        </p>
      {:else if $userName}
        <p class="text-emerald-600 text-xs mt-2 ml-1 flex items-center gap-1">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"
            ><path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            ></path></svg
          >
          Mahasiswa terverifikasi (No. Urut: {$studentNo})
        </p>
      {/if}

      <div class="mt-4 pt-4 border-t border-gray-100">
        <label
          class="block text-sm font-semibold text-gray-700 mb-2"
          for="orderNote"
        >
          Catatan Tambahan <span class="text-gray-400 font-normal"
            >(Opsional)</span
          >
        </label>
        <textarea
          id="orderNote"
          bind:value={$orderNote}
          rows="2"
          placeholder="Contoh: Es Tehnya manis ya kak, Sambalnya dipisah..."
          class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-emerald-500 focus:outline-none transition-colors text-sm resize-none"
        ></textarea>
      </div>
    </div>

    <!-- Bukber Special Packages -->
    <section class="mb-8">
      <div class="flex items-center gap-2 mb-4">
        <span class="text-2xl">🌟</span>
        <h2 class="text-xl font-bold text-emerald-800">Paket Spesial Bukber</h2>
      </div>
      <p class="text-gray-600 text-sm mb-4">
        Pilih paket hemat untuk bukber! Sudah termasuk makanan + minuman +
        dessert.
      </p>

      {#each bukberCategories as category}
        <div class="mb-6">
          <h3
            class="text-lg font-semibold text-emerald-700 mb-3 flex items-center gap-2"
          >
            {#if category.includes("Ayam")}
              <span>🍗</span>
            {:else}
              <span>🍱</span>
            {/if}
            {category}
          </h3>
          <div class="space-y-2">
            {#each MENU_DATA[category] as item}
              <button
                onclick={() => selectItem(item)}
                class="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left border-2 border-transparent hover:border-emerald-300 group"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1 pr-4">
                    <p
                      class="font-medium text-gray-800 group-hover:text-emerald-700 transition-colors"
                    >
                      {item.name}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      {#if item.requiresAyamPart || item.requiresAyamSauce || item.requiresKatsuSauce || item.requiresSquash}
                        <span
                          class="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold"
                          >Customizable</span
                        >
                      {/if}
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-bold text-emerald-600">
                      {formatRupiah(item.price)}
                    </p>
                    <span
                      class="text-[10px] text-gray-400 uppercase font-bold tracking-tighter"
                      >+ Tap to add</span
                    >
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </section>

    <!-- Regular Menu -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <span class="text-2xl">🍽️</span>
        <h2 class="text-xl font-bold text-gray-800">Menu Lainnya</h2>
      </div>
      <p class="text-gray-600 text-sm mb-4">
        Tambah menu favorit kamu atau pesan terpisah.
      </p>

      {#each regularCategories as category}
        <div class="mb-6">
          <h3
            class="text-md font-bold text-gray-700 mb-3 bg-gradient-to-r from-gray-100 to-transparent px-3 py-2 rounded-lg border-l-4 border-emerald-500"
          >
            {category}
          </h3>
          <div class="grid grid-cols-1 gap-2">
            {#each MENU_DATA[category] as item}
              <button
                onclick={() => selectItem(item)}
                class="w-full bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all text-left border border-gray-100 hover:border-emerald-300"
              >
                <div class="flex justify-between items-center">
                  <div class="flex-1">
                    <p class="font-medium text-gray-800 text-sm">{item.name}</p>
                    {#if item.requiresLevel}
                      <span class="text-[10px] font-bold text-red-500 uppercase"
                        >Pilih Level</span
                      >
                    {/if}
                    {#if item.requiresSausMMB}
                      <span
                        class="text-[10px] font-bold text-amber-600 uppercase"
                        >Pilih Saus</span
                      >
                    {/if}
                  </div>
                  <p class="font-semibold text-emerald-600">
                    {formatRupiah(item.price)}
                  </p>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </section>
  </main>

  <!-- Item Modal -->
  <ItemModal item={selectedItem} onClose={closeModal} />

  <!-- Cart Bar -->
  <CartBar onCheckout={handleCheckout} />

  <CartBar onCheckout={handleCheckout} />

  <!-- Loading Overlay -->
  {#if isSubmitting}
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center transition-all"
    >
      <div class="bg-white rounded-2xl p-8 text-center shadow-2xl">
        <div
          class="animate-spin w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-6"
        ></div>
        <p class="text-emerald-900 font-bold text-lg">
          Mendaftarkan pesanan...
        </p>
        <p class="text-gray-400 text-sm mt-1">Jangan tutup halaman ini</p>
      </div>
    </div>
  {/if}
</div>
