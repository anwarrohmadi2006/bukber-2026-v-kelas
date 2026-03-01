<script lang="ts">
  import { cart, subTotal, subsidyApplied, finalTotalToPay, itemCount, userName } from '../lib/stores/cart';
  import { formatRupiah, type CartItem } from '../lib/data/menu';

  interface Props {
    onCheckout: () => void;
  }

  let { onCheckout }: Props = $props();
  
  let showCart = $state(false);

  function removeItem(id: string) {
    cart.removeItem(id);
  }

  function updateQty(item: CartItem, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      cart.removeItem(item.id);
    } else {
      cart.updateQuantity(item.id, newQty);
    }
  }

  function getVariantText(item: CartItem): string {
    const parts: string[] = [];
    if (item.variants.ayamPart) parts.push(item.variants.ayamPart);
    if (item.variants.ayamSauce) parts.push(`Saus ${item.variants.ayamSauce}`);
    if (item.variants.katsuSauce) parts.push(`Saus ${item.variants.katsuSauce}`);
    if (item.variants.squashFlavor) parts.push(`Squash ${item.variants.squashFlavor}`);
    if (item.variants.sausMMB) parts.push(item.variants.sausMMB);
    if (item.variants.level) parts.push(`Level ${item.variants.level}`);
    return parts.join(' - ');
  }
</script>

{#if $itemCount > 0}
  <!-- Cart Summary Bar -->
  <div class="fixed bottom-0 left-0 right-0 z-40">
    <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 shadow-lg">
      <!-- Cart Toggle Button -->
      <button
        onclick={() => showCart = !showCart}
        class="w-full flex items-center justify-between mb-3"
      >
        <div class="flex items-center gap-2">
          <div class="bg-white/20 rounded-full px-3 py-1 text-sm font-semibold">
            {$itemCount} item
          </div>
          <span class="text-emerald-100 text-sm">{showCart ? 'Sembunyikan' : 'Lihat Keranjang'}</span>
        </div>
        <svg class="w-5 h-5 transition-transform {showCart ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
        </svg>
      </button>

      <!-- Cart Items (Collapsible) -->
      {#if showCart}
        <div class="bg-white rounded-xl p-3 mb-3 max-h-64 overflow-y-auto">
          {#each $cart as item (item.id)}
            <div class="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
              <div class="flex-1">
                <p class="text-gray-800 font-medium text-sm">{item.name}</p>
                {#if getVariantText(item)}
                  <p class="text-gray-500 text-xs">{getVariantText(item)}</p>
                {/if}
                {#if item.addons.length > 0}
                  <p class="text-amber-600 text-xs">+ {item.addons.map(a => a.name).join(', ')}</p>
                {/if}
                <p class="text-emerald-600 font-semibold text-sm mt-1">{formatRupiah(item.totalItemPrice)}</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  onclick={() => updateQty(item, -1)}
                  class="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold hover:bg-gray-200"
                >
                  -
                </button>
                <span class="text-gray-800 font-medium w-5 text-center">{item.quantity}</span>
                <button
                  onclick={() => updateQty(item, 1)}
                  class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold hover:bg-emerald-200"
                >
                  +
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Price Summary -->
      <div class="space-y-1 text-sm mb-3">
        <div class="flex justify-between">
          <span class="text-emerald-100">Subtotal</span>
          <span>{formatRupiah($subTotal)}</span>
        </div>
        <div class="flex justify-between text-amber-300">
          <span>Subsidi</span>
          <span>-{formatRupiah($subsidyApplied)}</span>
        </div>
        <div class="flex justify-between font-bold text-lg pt-1 border-t border-emerald-500">
          <span>Total Bayar</span>
          <span>{formatRupiah($finalTotalToPay)}</span>
        </div>
      </div>

      <!-- Checkout Button -->
      <button
        onclick={onCheckout}
        disabled={!$userName.trim()}
        class="w-full py-3 rounded-xl font-bold transition-all {$userName.trim() ? 'bg-amber-400 text-amber-900 hover:bg-amber-300' : 'bg-gray-400 text-gray-600 cursor-not-allowed'}"
      >
        {$userName.trim() ? 'Pesan Sekarang' : 'Masukkan Nama Dulu'}
      </button>
    </div>
  </div>

  <!-- Spacer to prevent content from being hidden behind the bar -->
  <div class="h-48"></div>
{/if}
