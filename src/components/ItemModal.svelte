<script lang="ts">
  import { cart } from '../lib/stores/cart';
  import { BUKBER_VARIANTS, ADD_ONS, formatRupiah, type MenuItem, type CartItem } from '../lib/data/menu';

  interface Props {
    item: MenuItem | null;
    onClose: () => void;
  }
  
  let { item, onClose }: Props = $props();

  let selectedAyamPart = $state('');
  let selectedAyamSauce = $state('');
  let selectedKatsuSauce = $state('');
  let selectedSquash = $state('');
  let selectedSausMMB = $state('');
  let selectedLevel = $state(1);
  let quantity = $state(1);
  let selectedAddons = $state<{name: string; price: number}[]>([]);

  function toggleAddon(addon: {name: string; price: number}) {
    const index = selectedAddons.findIndex(a => a.name === addon.name);
    if (index >= 0) {
      selectedAddons = selectedAddons.filter(a => a.name !== addon.name);
    } else {
      selectedAddons = [...selectedAddons, addon];
    }
  }

  function isAddonSelected(name: string): boolean {
    return selectedAddons.some(a => a.name === name);
  }

  let addonTotal = $derived(selectedAddons.reduce((sum, a) => sum + a.price, 0));
  let totalPrice = $derived(item ? (item.price + addonTotal) * quantity : 0);

  let canAddToCart = $derived(() => {
    if (!item) return false;
    if (item.requiresAyamPart && !selectedAyamPart) return false;
    if (item.requiresAyamSauce && !selectedAyamSauce) return false;
    if (item.requiresKatsuSauce && !selectedKatsuSauce) return false;
    if (item.requiresSquash && !selectedSquash) return false;
    if (item.requiresSausMMB && !selectedSausMMB) return false;
    return true;
  });

  function addToCart() {
    if (!item || !canAddToCart()) return;

    const cartItem: CartItem = {
      id: `${item.id}_${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      basePrice: item.price,
      quantity,
      variants: {
        ...(item.requiresAyamPart && { ayamPart: selectedAyamPart }),
        ...(item.requiresAyamSauce && { ayamSauce: selectedAyamSauce }),
        ...(item.requiresKatsuSauce && { katsuSauce: selectedKatsuSauce }),
        ...(item.requiresSquash && { squashFlavor: selectedSquash }),
        ...(item.requiresSausMMB && { sausMMB: selectedSausMMB }),
        ...(item.requiresLevel && { level: selectedLevel }),
      },
      addons: [...selectedAddons],
      totalItemPrice: totalPrice
    };

    cart.addItem(cartItem);
    resetAndClose();
  }

  function resetAndClose() {
    selectedAyamPart = '';
    selectedAyamSauce = '';
    selectedKatsuSauce = '';
    selectedSquash = '';
    selectedSausMMB = '';
    selectedLevel = 1;
    quantity = 1;
    selectedAddons = [];
    onClose();
  }
</script>

{#if item}
<div class="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" role="button" tabindex="0" on:click={resetAndClose} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && resetAndClose()}>
  <div 
    class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="0"
    on:click={(e) => e.stopPropagation()}
  >
    <!-- Header -->
    <div class="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 rounded-t-2xl sm:rounded-t-2xl">
      <div class="flex justify-between items-start">
        <div class="flex-1 pr-4">
          <h3 id="modal-title" class="font-bold text-lg">{item.name}</h3>
          <p class="text-emerald-100 text-xl font-semibold mt-1">{formatRupiah(item.price)}</p>
        </div>
        <button 
          on:click={resetAndClose}
          class="text-white/80 hover:text-white p-1"
          aria-label="Close modal"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="p-4 space-y-4">
      <!-- Variant Selections -->
      {#if item.requiresAyamPart}
        <div>
          <label for="ayamPart" class="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Bagian Ayam <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-2" id="ayamPart">
            {#each BUKBER_VARIANTS.ayamPart as part}
              <button
                type="button"
                on:click={() => selectedAyamPart = part}
                class="py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all {selectedAyamPart === part ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-emerald-300'}"
              >
                {part}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if item.requiresAyamSauce}
        <div>
          <label for="ayamSauce" class="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Saus Ayam <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-2" id="ayamSauce">
            {#each BUKBER_VARIANTS.ayamSauce as sauce}
              <button
                type="button"
                on:click={() => selectedAyamSauce = sauce}
                class="py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all {selectedAyamSauce === sauce ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-emerald-300'}"
              >
                {sauce}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if item.requiresKatsuSauce}
        <div>
          <label for="katsuSauce" class="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Saus Katsu <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-2" id="katsuSauce">
            {#each BUKBER_VARIANTS.katsuSauce as sauce}
              <button
                type="button"
                on:click={() => selectedKatsuSauce = sauce}
                class="py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all {selectedKatsuSauce === sauce ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-emerald-300'}"
              >
                {sauce}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if item.requiresSquash}
        <div>
          <label for="squashFlavor" class="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Rasa Squash <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-2" id="squashFlavor">
            {#each BUKBER_VARIANTS.squashFlavor as flavor}
              <button
                type="button"
                on:click={() => selectedSquash = flavor}
                class="py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all {selectedSquash === flavor ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-emerald-300'}"
              >
                {flavor}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if item.requiresSausMMB}
        <div>
          <label for="sausMMB" class="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Saus MMB <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-1 gap-2" id="sausMMB">
            {#each BUKBER_VARIANTS.sausMMB as sauce}
              <button
                type="button"
                on:click={() => selectedSausMMB = sauce}
                class="py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all {selectedSausMMB === sauce ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-emerald-300'}"
              >
                {sauce}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if item.requiresLevel}
        <div>
          <label for="levelPedas" class="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Level Pedas
          </label>
          <div class="grid grid-cols-3 gap-2" id="levelPedas">
            {#each BUKBER_VARIANTS.levels as level}
              <button
                type="button"
                on:click={() => selectedLevel = level}
                class="py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all {selectedLevel === level ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-300'}"
              >
                Level {level}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Add-ons Section -->
      <div>
        <label for="tambahanSaus" class="block text-sm font-semibold text-gray-700 mb-2">
          Tambahan Saus (Opsional)
        </label>
        <div class="grid grid-cols-2 gap-2" id="tambahanSaus">
          {#each ADD_ONS.saus as addon}
            <button
              type="button"
              on:click={() => toggleAddon(addon)}
              class="py-2 px-3 rounded-lg border-2 text-sm transition-all {isAddonSelected(addon.name) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-amber-300'}"
            >
              <span class="font-medium">{addon.name}</span>
              <span class="text-xs block text-gray-500">+{formatRupiah(addon.price)}</span>
            </button>
          {/each}
        </div>
      </div>

      <div>
        <label for="tambahanTopping" class="block text-sm font-semibold text-gray-700 mb-2">
          Tambahan Topping (Opsional)
        </label>
        <div class="grid grid-cols-2 gap-2" id="tambahanTopping">
          {#each ADD_ONS.topping as addon}
            <button
              type="button"
              on:click={() => toggleAddon(addon)}
              class="py-2 px-3 rounded-lg border-2 text-sm transition-all {isAddonSelected(addon.name) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-amber-300'}"
            >
              <span class="font-medium">{addon.name}</span>
              <span class="text-xs block text-gray-500">+{formatRupiah(addon.price)}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Quantity -->
      <div>
        <label for="jumlah" class="block text-sm font-semibold text-gray-700 mb-2">Jumlah</label>
        <div class="flex items-center gap-3" id="jumlah">
          <button
            type="button"
            on:click={() => quantity = Math.max(1, quantity - 1)}
            class="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-lg"
            aria-label="Reduce quantity"
          >
            -
          </button>
          <span class="text-xl font-semibold w-8 text-center">{quantity}</span>
          <button
            type="button"
            on:click={() => quantity++}
            class="w-10 h-10 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-lg"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="sticky bottom-0 bg-white border-t p-4">
      <button
        on:click={addToCart}
        disabled={!canAddToCart()}
        class="w-full py-3 px-4 rounded-xl font-bold text-white transition-all {canAddToCart() ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg' : 'bg-gray-300 cursor-not-allowed'}"
      >
        <span class="flex items-center justify-center gap-2">
          <span>Tambah ke Keranjang</span>
          <span class="bg-white/20 px-2 py-0.5 rounded">{formatRupiah(totalPrice)}</span>
        </span>
      </button>
    </div>
  </div>
</div>
{/if}