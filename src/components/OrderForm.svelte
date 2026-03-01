<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    cart,
    userName,
    userNIM,
    studentNo,
    subTotal,
    subsidyApplied,
    finalTotalToPay,
    subsidyAmountStore,
    fetchSubsidyAmount,
    generateOrderPayload,
    resetOrder,
  } from "../lib/stores/cart";
  import {
    MENU_DATA,
    getBukberCategories,
    getRegularCategories,
    formatRupiah,
    type MenuItem,
  } from "../lib/data/menu";
  import { findStudentByNIM } from "../lib/data/students";
  import { generateDynamicQRIS } from "../lib/utils/qris";
  import ItemModal from "./ItemModal.svelte";
  import CartBar from "./CartBar.svelte";
  import QRCode from "qrcode";

  const BASE_QRIS =
    "00020101021126610014COM.GO-JEK.WWW01189360091434963481800210G4963481800303UMI51440014ID.CO.QRIS.WWW0215ID10264841120850303UMI5204829953033605802ID5919HMPS Sains Data UIN6009SUKOHARJO61055716862070703A0163046730";

  onMount(() => {
    fetchSubsidyAmount();
  });

  let selectedItem = $state<MenuItem | null>(null);
  let showSuccess = $state(false);
  let isSubmitting = $state(false);
  let orderResult = $state<{
    finalTotalToPay: number;
    orderId?: number;
    qrisData?: string;
  } | null>(null);
  let qrCanvas = $state<HTMLCanvasElement | null>(null);

  const bukberCategories = getBukberCategories();
  const regularCategories = getRegularCategories();

  // Watch NIM changes to lookup student
  $effect(() => {
    if ($userNIM.length >= 8) {
      const student = findStudentByNIM($userNIM);
      if (student) {
        $userName = student.nama;
        $studentNo = student.no;
      } else {
        $userName = "";
        $studentNo = 0;
      }
    } else {
      $userName = "";
      $studentNo = 0;
    }
  });

  // Watch success modal and canvas to render QR
  $effect(() => {
    if (showSuccess && orderResult?.qrisData && qrCanvas) {
      QRCode.toCanvas(qrCanvas, orderResult.qrisData, {
        width: 256,
        margin: 2,
        color: {
          dark: "#064e3b",
          light: "#ffffff",
        },
      });
    }
  });

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
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to submit order");
      }

      const result = await response.json();

      let qrisData = "";
      if (payload.finalTotalToPay > 0) {
        qrisData = generateDynamicQRIS(BASE_QRIS, payload.finalTotalToPay);
      }

      orderResult = {
        finalTotalToPay: payload.finalTotalToPay,
        orderId: result.id,
        qrisData,
      };

      showSuccess = true;
      resetOrder();
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Gagal mengirim pesanan. Silakan coba lagi.");
    } finally {
      isSubmitting = false;
    }
  }

  function closeSuccess() {
    showSuccess = false;
    orderResult = null;
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
        <p
          class="text-emerald-50 text-lg font-light max-w-md mx-auto leading-relaxed mb-6"
        >
          Rayakan kebersamaan di bulan suci dengan pilihan menu terbaik dari
          kami.
        </p>

        <div
          class="bg-gradient-to-r from-amber-500 to-amber-600 rounded-full px-6 py-2 inline-flex items-center gap-2 shadow-lg border border-amber-400/50 hover:scale-105 transition-transform cursor-default"
        >
          <span class="text-amber-950 font-bold text-sm tracking-wide uppercase"
            >Special Offer</span
          >
          <div class="w-1 h-1 rounded-full bg-amber-950/30"></div>
          <span class="text-white font-semibold"
            >Subsidi {formatRupiah($subsidyAmountStore)} per orang</span
          >
        </div>
      {/if}
    </div>
  </header>

  <main class="max-w-2xl mx-auto px-4 py-6">
    <!-- Identitas Section -->
    <div
      class="bg-white rounded-2xl shadow-md p-6 mb-6 border border-emerald-100"
    >
      <div class="flex items-center gap-2 mb-4">
        <span class="text-xl">🪪</span>
        <h2 class="text-lg font-bold text-gray-800">Identitas Pemesan</h2>
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

  <!-- Success Modal & QRIS -->
  {#if showSuccess && orderResult}
    <div
      class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        class="bg-white rounded-3xl w-full max-w-sm p-6 text-center my-auto shadow-2xl border border-emerald-100"
      >
        <div class="text-5xl mb-4 animate-bounce">✅</div>
        <h3 class="text-2xl font-bold text-emerald-800 mb-1">
          Pesanan Berhasil!
        </h3>
        <p class="text-gray-500 text-sm mb-6">
          Terima kasih, <span class="font-bold text-gray-800">{$userName}</span
          >. Pesanan kamu telah tercatat.
        </p>

        {#if orderResult.finalTotalToPay > 0}
          <div
            class="bg-emerald-900 rounded-2xl p-6 mb-6 text-white shadow-inner relative overflow-hidden"
          >
            <!-- Background Decoration -->
            <div
              class="absolute -right-4 -bottom-4 text-white/5 text-8xl font-black"
            >
              QRIS
            </div>

            <p
              class="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-2"
            >
              Total Pembayaran Unik
            </p>
            <p
              class="text-3xl font-black text-amber-400 mb-1 leading-none font-mono"
            >
              {formatRupiah(orderResult.finalTotalToPay)}
            </p>
            <p class="text-[10px] text-emerald-300 italic opacity-80">
              *Termasuk kode pesanan No. {$studentNo}
            </p>

            <div class="mt-6 bg-white p-3 rounded-xl inline-block shadow-lg">
              <canvas bind:this={qrCanvas} class="mx-auto block"></canvas>
            </div>

            <div class="mt-4 space-y-2 text-left">
              <p class="text-[10px] leading-tight text-white/90">
                1. Buka aplikasi M-Banking/E-Wallet (Dana, OVO, dll)
              </p>
              <p class="text-[10px] leading-tight text-white/90">
                2. Scan kode QR di atas
              </p>
              <p class="text-[10px] leading-tight text-amber-300 font-bold">
                3. Pastikan nominal transfer sama persis!
              </p>
            </div>
          </div>
        {:else}
          <div
            class="bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl p-6 mb-6"
          >
            <p class="text-3xl font-black text-emerald-700 mb-1">GRATIS!</p>
            <p class="text-sm text-emerald-800 font-medium">
              Pesanan kamu sepenuhnya ditanggung subsidi kelas.
            </p>
          </div>
        {/if}

        <button
          onclick={closeSuccess}
          class="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-700 active:scale-95 transition-all text-lg"
        >
          Selesai & Tutup
        </button>
      </div>
    </div>
  {/if}

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
