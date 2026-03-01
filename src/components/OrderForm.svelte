<script lang="ts">
  import { onMount } from "svelte";
  import {
    cart,
    userName,
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
  import ItemModal from "./ItemModal.svelte";
  import CartBar from "./CartBar.svelte";

  onMount(() => {
    fetchSubsidyAmount();
  });

  let selectedItem = $state<MenuItem | null>(null);
  let showSuccess = $state(false);
  let isSubmitting = $state(false);
  let orderResult = $state<{
    finalTotalToPay: number;
    orderId?: number;
  } | null>(null);

  const bukberCategories = getBukberCategories();
  const regularCategories = getRegularCategories();

  function selectItem(item: MenuItem) {
    selectedItem = item;
  }

  function closeModal() {
    selectedItem = null;
  }

  async function handleCheckout() {
    if (!$userName.trim()) {
      alert("Silakan masukkan nama Anda terlebih dahulu!");
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
      orderResult = {
        finalTotalToPay: payload.finalTotalToPay,
        orderId: result.id,
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

<div class="min-h-screen bg-gradient-to-b from-emerald-50 to-amber-50">
  <!-- Header -->
  <header
    class="mesh-gradient text-white py-12 px-4 shadow-xl relative overflow-hidden"
  >
    <!-- Decorative Elements -->
    <div
      class="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
    >
      <div class="absolute top-10 left-10 text-4xl transform -rotate-12">
        ⭐
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
    <!-- Name Input -->
    <div class="bg-white rounded-2xl shadow-md p-4 mb-6">
      <label
        class="block text-sm font-semibold text-gray-700 mb-2"
        for="userName"
      >
        Nama Kamu <span class="text-red-500">*</span>
      </label>
      <input
        id="userName"
        type="text"
        bind:value={$userName}
        placeholder="Masukkan nama kamu..."
        class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:outline-none transition-colors"
      />
    </div>

    <!-- Bukber Special Packages -->
    <section class="mb-8">
      <div class="flex items-center gap-2 mb-4">
        <span class="text-2xl">&#127775;</span>
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
              <span>&#127831;</span>
            {:else}
              <span>&#127833;</span>
            {/if}
            {category}
          </h3>
          <div class="space-y-2">
            {#each MENU_DATA[category] as item}
              <button
                onclick={() => selectItem(item)}
                class="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left border-2 border-transparent hover:border-emerald-300"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1 pr-4">
                    <p class="font-medium text-gray-800">{item.name}</p>
                    <div class="flex items-center gap-2 mt-1">
                      {#if item.requiresAyamPart || item.requiresAyamSauce || item.requiresKatsuSauce || item.requiresSquash}
                        <span
                          class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"
                          >Pilih Varian</span
                        >
                      {/if}
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-bold text-emerald-600">
                      {formatRupiah(item.price)}
                    </p>
                    <span class="text-xs text-gray-400">+ pilih</span>
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
        <span class="text-2xl">&#127869;</span>
        <h2 class="text-xl font-bold text-gray-800">Menu Lainnya</h2>
      </div>
      <p class="text-gray-600 text-sm mb-4">
        Tambah menu favorit kamu atau pesan terpisah.
      </p>

      {#each regularCategories as category}
        <div class="mb-6">
          <h3
            class="text-md font-semibold text-gray-700 mb-3 bg-gradient-to-r from-gray-100 to-transparent px-3 py-2 rounded-lg"
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
                      <span class="text-xs text-red-500">Pilih Level</span>
                    {/if}
                    {#if item.requiresSausMMB}
                      <span class="text-xs text-amber-600">Pilih Saus</span>
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

  <!-- Success Modal -->
  {#if showSuccess && orderResult}
    <div
      class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
        <div class="text-6xl mb-4">&#127881;</div>
        <h3 class="text-xl font-bold text-emerald-700 mb-2">
          Pesanan Berhasil!
        </h3>
        <p class="text-gray-600 mb-4">
          Terima kasih sudah memesan untuk bukber.
        </p>

        {#if orderResult.finalTotalToPay > 0}
          <div class="bg-amber-50 rounded-xl p-4 mb-4">
            <p class="text-sm text-gray-600 mb-1">Total yang perlu dibayar:</p>
            <p class="text-2xl font-bold text-amber-600">
              {formatRupiah(orderResult.finalTotalToPay)}
            </p>
            <p class="text-xs text-gray-500 mt-2">
              Silakan transfer ke rekening panitia
            </p>
          </div>
        {:else}
          <div class="bg-emerald-50 rounded-xl p-4 mb-4">
            <p class="text-lg font-bold text-emerald-600">GRATIS!</p>
            <p class="text-sm text-gray-600">Pesanan kamu ditanggung subsidi</p>
          </div>
        {/if}

        <button
          onclick={closeSuccess}
          class="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  {/if}

  <!-- Loading Overlay -->
  {#if isSubmitting}
    <div
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-xl p-6 text-center">
        <div
          class="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"
        ></div>
        <p class="text-gray-600">Mengirim pesanan...</p>
      </div>
    </div>
  {/if}
</div>
