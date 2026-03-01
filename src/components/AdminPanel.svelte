<script lang="ts">
  import { onMount } from "svelte";
  import { formatRupiah, type CartItem } from "../lib/data/menu";
  import * as XLSX from "xlsx";

  interface Order {
    id: number;
    userName: string;
    userNIM?: string;
    studentNo?: number;
    items: CartItem[];
    subTotal: number;
    subsidyApplied: number;
    finalTotalToPay: number;
    paymentProofUrl?: string;
    paymentStatus?: "pending" | "approved";
    createdAt: string;
  }

  interface ItemStats {
    name: string;
    quantity: number;
    totalRevenue: number;
  }

  let orders = $state<Order[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let activeTab = $state<"orders" | "stats">("orders");
  let viewingImageUrl = $state<string | null>(null);
  let isAdminMode = $state(true);
  let editingOrder = $state<Order | null>(null);
  let subsidyAmount = $state(30000);
  let savingSubsidy = $state(false);

  // Summary stats
  let totalOrders = $derived(orders.length);
  let totalSubtotal = $derived(orders.reduce((sum, o) => sum + o.subTotal, 0));
  let totalSubsidy = $derived(
    orders.reduce((sum, o) => sum + o.subsidyApplied, 0),
  );
  let totalToPay = $derived(
    orders.reduce((sum, o) => sum + o.finalTotalToPay, 0),
  );

  // Item statistics - aggregate all items across orders
  let itemStats = $derived(() => {
    const statsMap = new Map<string, ItemStats>();

    for (const order of orders) {
      for (const item of order.items) {
        const key = item.name;
        const existing = statsMap.get(key);
        if (existing) {
          existing.quantity += item.quantity;
          existing.totalRevenue += item.totalItemPrice;
        } else {
          statsMap.set(key, {
            name: item.name,
            quantity: item.quantity,
            totalRevenue: item.totalItemPrice,
          });
        }
      }
    }

    return Array.from(statsMap.values()).sort(
      (a, b) => b.quantity - a.quantity,
    );
  });

  let totalItemsOrdered = $derived(
    itemStats().reduce((sum, s) => sum + s.quantity, 0),
  );

  onMount(async () => {
    // Component is only accessible by admin now
    await Promise.all([fetchOrders(true), fetchSubsidy()]);
  });

  async function fetchSubsidy() {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        if (data.subsidyAmount !== undefined) {
          subsidyAmount = data.subsidyAmount;
        }
      }
    } catch (e) {
      console.error("Failed to fetch subsidy:", e);
    }
  }

  async function saveSubsidyAmount() {
    savingSubsidy = true;
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subsidyAmount }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          error = "Sesi admin telah habis. Silakan login kembali.";
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Failed to update subsidy");
      }
      alert(
        "Subsidi berhasil diperbarui menjadi " + formatRupiah(subsidyAmount),
      );
    } catch (e) {
      alert("Gagal memperbarui subsidi");
    } finally {
      savingSubsidy = false;
    }
  }

  async function fetchOrders(adminMode = false) {
    loading = true;
    error = null;
    try {
      const url = adminMode ? "/api/orders?admin=true" : "/api/orders";
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          error = "Sesi admin telah habis. Silakan login kembali.";
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Failed to fetch orders");
      }
      const data = await response.json();
      orders = data.orders || [];
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
    } finally {
      loading = false;
    }
  }

  async function deleteOrder(orderId: number) {
    if (!confirm("Apakah Anda yakin ingin menghapus pesanan ini?")) return;

    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          error = "Sesi admin telah habis. Silakan login kembali.";
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Failed to delete order");
      }

      // Remove the order from the list
      orders = orders.filter((order) => order.id !== orderId);

      // Show success message
      alert("Pesanan berhasil dihapus");
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
      alert("Gagal menghapus pesanan: " + error);
    }
  }

  async function approvePayment(order: Order) {
    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...order, paymentStatus: "approved" }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve payment");
      }

      // Update local state
      const index = orders.findIndex((o) => o.id === order.id);
      if (index !== -1) {
        orders[index].paymentStatus = "approved";
      }
    } catch (e) {
      alert("Gagal memverifikasi pembayaran.");
    }
  }

  function startEditingOrder(order: Order) {
    editingOrder = { ...order };
  }

  async function saveEditedOrder() {
    if (!editingOrder) return;

    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingOrder),
      });

      if (!response.ok) {
        if (response.status === 401) {
          error = "Sesion admin telah habis. Silakan login kembali.";
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Failed to update order");
      }

      // Update the order in the list
      const tempOrder = editingOrder;
      if (tempOrder) {
        const index = orders.findIndex((o) => o.id === tempOrder.id);
        if (index !== -1) {
          orders[index] = { ...tempOrder };
        }
      }

      // Close the edit modal
      editingOrder = null;

      // Show success message
      alert("Pesanan berhasil diperbarui");
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
      alert("Gagal memperbarui pesanan: " + error);
    }
  }

  function cancelEditing() {
    editingOrder = null;
  }

  function updateFinalTotal() {
    if (!editingOrder) return;
    editingOrder.finalTotalToPay = Math.max(
      0,
      editingOrder.subTotal - editingOrder.subsidyApplied,
    );
  }

  function getVariantText(item: CartItem): string {
    const parts: string[] = [];
    if (item.variants.ayamPart) parts.push(item.variants.ayamPart);
    if (item.variants.ayamSauce) parts.push(`Saus ${item.variants.ayamSauce}`);
    if (item.variants.katsuSauce)
      parts.push(`Saus ${item.variants.katsuSauce}`);
    if (item.variants.squashFlavor)
      parts.push(`Squash ${item.variants.squashFlavor}`);
    if (item.variants.sausMMB) parts.push(item.variants.sausMMB);
    if (item.variants.level) parts.push(`Level ${item.variants.level}`);
    return parts.join(" - ");
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function resetDatabase() {
    if (
      !confirm(
        "PERINGATAN BAHAYA: Apakah Anda yakin ingin MENGHAPUS SEMUA PESANAN secara permanen? Data ini tidak dapat dikembalikan!",
      )
    )
      return;

    // Double confirmation for safety
    if (
      !confirm(
        "Ini adalah konfirmasi terakhir. Semua database akan di-reset menjadi kosong. Lanjutkan?",
      )
    )
      return;

    try {
      const response = await fetch(`/api/orders?id=ALL`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          error = "Sesi admin telah habis. Silakan login kembali.";
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Failed to reset database");
      }

      await fetchOrders(true);
      alert("Seluruh database pesanan berhasil direset!");
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
      alert("Gagal mereset database: " + error);
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (response.ok) {
        window.location.href = "/admin/login";
      }
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/admin/login";
    }
  }

  function exportToExcel() {
    // Sheet 1: All Orders
    const ordersData = orders.flatMap((order) =>
      order.items.map((item) => ({
        Nama: order.userName,
        NIM: order.userNIM || "-",
        "No. Urut": order.studentNo || "-",
        Tanggal: formatDate(order.createdAt),
        Menu: item.name,
        Varian: getVariantText(item) || "-",
        Tambahan: item.addons.map((a) => a.name).join(", ") || "-",
        Qty: item.quantity,
        "Harga Item": item.totalItemPrice,
        "Subtotal Pesanan": order.subTotal,
        Subsidi: order.subsidyApplied,
        "Total Bayar": order.finalTotalToPay,
        "Status Pembayaran":
          order.paymentStatus === "approved" ? "Disetujui" : "Menunggu",
      })),
    );

    // Sheet 2: Item Statistics
    const statsData = itemStats().map((stat) => ({
      Menu: stat.name,
      "Total Qty": stat.quantity,
      "Total Pendapatan": stat.totalRevenue,
    }));

    // Sheet 3: Summary
    const summaryData = [
      { Keterangan: "Total Pesanan", Nilai: totalOrders },
      { Keterangan: "Total Item Dipesan", Nilai: totalItemsOrdered },
      { Keterangan: "Total Subtotal", Nilai: totalSubtotal },
      { Keterangan: "Total Subsidi", Nilai: totalSubsidy },
      { Keterangan: "Total Harus Bayar", Nilai: totalToPay },
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, ws1, "Detail Pesanan");

    const ws2 = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, ws2, "Statistik Menu");

    const ws3 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws3, "Ringkasan");

    // Download
    XLSX.writeFile(
      wb,
      `Bukber2026_Pesanan_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }
</script>

<div class="min-h-screen bg-gray-100">
  <!-- Header -->
  <header
    class="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white py-6 px-4 shadow-lg"
  >
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Admin - Bukber 2026</h1>
          <p class="text-emerald-200 text-sm">Rekap Semua Pesanan</p>
        </div>
        <div class="flex gap-2">
          {#if isAdminMode}
            <button
              onclick={handleLogout}
              class="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Keluar
            </button>
          {:else}
            <a
              href="/admin/login"
              class="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Masuk Admin
            </a>
          {/if}
          <a
            href="/"
            class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Kembali ke Menu
          </a>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 py-6">
    <!-- Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-gray-500 text-sm">Total Pesanan</p>
        <p class="text-2xl font-bold text-gray-800">{totalOrders}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-gray-500 text-sm">Total Subtotal</p>
        <p class="text-xl font-bold text-gray-800">
          {formatRupiah(totalSubtotal)}
        </p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-gray-500 text-sm">Total Subsidi</p>
        <p class="text-xl font-bold text-amber-600">
          {formatRupiah(totalSubsidy)}
        </p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-gray-500 text-sm">Total Harus Bayar</p>
        <p class="text-xl font-bold text-emerald-600">
          {formatRupiah(totalToPay)}
        </p>
      </div>
    </div>

    <!-- Subsidy Config (Admin Only) -->
    {#if isAdminMode}
      <div class="bg-white rounded-xl p-4 shadow-sm mb-6">
        <h3 class="font-semibold text-gray-700 mb-3">⚙️ Pengaturan Subsidi</h3>
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <label
            for="subsidy-input"
            class="text-sm font-medium text-gray-700 whitespace-nowrap"
            >Subsidi per orang:</label
          >
          <div class="flex items-center gap-2 w-full sm:flex-1">
            <span class="text-gray-500 text-sm font-bold">Rp</span>
            <input
              id="subsidy-input"
              type="number"
              bind:value={subsidyAmount}
              min="0"
              step="1000"
              class="flex-1 p-2 border border-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none rounded-lg text-sm transition-all"
            />
          </div>
          <button
            onclick={saveSubsidyAmount}
            disabled={savingSubsidy}
            class="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {savingSubsidy ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-2">
          Nominal subsidi yang diberikan ke setiap pemesan
        </p>
      </div>
    {/if}

    <!-- Action Buttons -->
    <div class="flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
      <button
        onclick={() => {
          fetchOrders(isAdminMode);
        }}
        disabled={loading}
        class="w-full sm:w-auto justify-center bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
      >
        {#if loading}
          <span class="animate-spin">&#8635;</span>
        {:else}
          <span>&#8635;</span>
        {/if}
        Refresh Data
      </button>

      <button
        onclick={exportToExcel}
        disabled={orders.length === 0}
        class="w-full sm:w-auto justify-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          ></path>
        </svg>
        Download Excel
      </button>

      {#if isAdminMode}
        <button
          onclick={resetDatabase}
          class="w-full sm:w-auto sm:ml-auto justify-center bg-rose-100 text-rose-700 font-bold px-4 py-2 rounded-lg hover:bg-rose-200 transition-colors flex items-center gap-2 border border-rose-200"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            ></path>
          </svg>
          Reset Database
        </button>
      {/if}
    </div>

    <!-- Tab Navigation -->
    <div class="flex gap-2 mb-4">
      <button
        onclick={() => (activeTab = "orders")}
        class="px-4 py-2 rounded-lg font-medium transition-colors {activeTab ===
        'orders'
          ? 'bg-emerald-600 text-white'
          : 'bg-white text-gray-600 hover:bg-gray-50'}"
      >
        Daftar Pesanan
      </button>
      <button
        onclick={() => (activeTab = "stats")}
        class="px-4 py-2 rounded-lg font-medium transition-colors {activeTab ===
        'stats'
          ? 'bg-emerald-600 text-white'
          : 'bg-white text-gray-600 hover:bg-gray-50'}"
      >
        Statistik Menu
      </button>
    </div>

    <!-- Error Message -->
    {#if error}
      <div
        class="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-4"
      >
        Error: {error}
      </div>
    {/if}

    <!-- Tab Content -->
    {#if activeTab === "stats"}
      <!-- Statistics View -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div
          class="bg-gradient-to-r from-blue-50 to-emerald-50 px-4 py-3 border-b"
        >
          <h2 class="font-bold text-gray-800">Statistik Menu yang Dipesan</h2>
          <p class="text-sm text-gray-500">
            Total {totalItemsOrdered} item dari {totalOrders} pesanan
          </p>
        </div>

        {#if itemStats().length === 0}
          <div class="p-8 text-center">
            <p class="text-gray-500">Belum ada data statistik</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="text-left px-4 py-3 text-sm font-semibold text-gray-600 whitespace-nowrap"
                    >No</th
                  >
                  <th
                    class="text-left px-4 py-3 text-sm font-semibold text-gray-600 min-w-[200px]"
                    >Menu</th
                  >
                  <th
                    class="text-center px-4 py-3 text-sm font-semibold text-gray-600 whitespace-nowrap"
                    >Jumlah</th
                  >
                  <th
                    class="text-right px-4 py-3 text-sm font-semibold text-gray-600 whitespace-nowrap"
                    >Total Pendapatan</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each itemStats() as stat, index}
                  <tr class="border-t border-gray-100 hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                    <td class="px-4 py-3">
                      <span class="font-medium text-gray-800">{stat.name}</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span
                        class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold"
                      >
                        {stat.quantity}x
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-gray-700">
                      {formatRupiah(stat.totalRevenue)}
                    </td>
                  </tr>
                {/each}
              </tbody>
              <tfoot class="bg-emerald-50">
                <tr>
                  <td colspan="2" class="px-4 py-3 font-bold text-gray-800"
                    >TOTAL</td
                  >
                  <td class="px-4 py-3 text-center font-bold text-emerald-700"
                    >{totalItemsOrdered}x</td
                  >
                  <td class="px-4 py-3 text-right font-bold text-emerald-700"
                    >{formatRupiah(totalSubtotal)}</td
                  >
                </tr>
              </tfoot>
            </table>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Orders List -->
      {#if loading && orders.length === 0}
        <div class="bg-white rounded-xl p-8 text-center">
          <div
            class="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"
          ></div>
          <p class="text-gray-500">Memuat data pesanan...</p>
        </div>
      {:else if orders.length === 0}
        <div class="bg-white rounded-xl p-8 text-center">
          <div class="text-4xl mb-4">&#128466;</div>
          <p class="text-gray-500">Belum ada pesanan</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each orders as order (order.id)}
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
              <!-- Order Header -->
              <div
                class="bg-gradient-to-r from-emerald-50 to-amber-50 px-4 py-3 border-b"
              >
                <div
                  class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h3 class="font-bold text-gray-800 text-lg">
                      {order.userName}
                      {#if order.userNIM}
                        <span
                          class="text-xs font-bold text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded ml-2"
                        >
                          #{order.userNIM}
                        </span>
                      {/if}
                    </h3>
                    <div
                      class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1 font-medium"
                    >
                      <span>{formatDate(order.createdAt)}</span>
                      {#if order.studentNo}
                        <span
                          class="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold"
                          >No. Urut: {order.studentNo}</span
                        >
                      {/if}
                    </div>
                    <div class="mt-3 text-xs flex">
                      {#if order.paymentStatus === "approved"}
                        <span
                          class="bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                        >
                          <svg
                            class="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2.5"
                              d="M5 13l4 4L19 7"
                            ></path></svg
                          >
                          Lunas
                        </span>
                      {:else}
                        <span
                          class="bg-amber-100 text-amber-800 shadow-sm border border-amber-200 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                        >
                          <div
                            class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                          ></div>
                          Menunggu Konfirmasi
                        </span>
                      {/if}
                    </div>
                  </div>
                  <div class="text-left sm:text-right mt-1 sm:mt-0">
                    {#if order.finalTotalToPay > 0}
                      <div class="flex flex-col">
                        <span
                          class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5"
                          >Tagihan</span
                        >
                        <span
                          class="text-xl sm:text-lg font-black text-gray-800 tracking-tight"
                        >
                          {formatRupiah(order.finalTotalToPay)}
                        </span>
                      </div>
                    {:else}
                      <span
                        class="bg-emerald-100 border border-emerald-200 shadow-sm text-emerald-800 px-4 py-1.5 rounded-full text-sm font-black tracking-widest"
                      >
                        GRATIS
                      </span>
                    {/if}
                  </div>
                </div>
              </div>

              <!-- Order Items -->
              <div class="p-4">
                <div class="space-y-2">
                  {#each order.items as item}
                    <div
                      class="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0"
                    >
                      <div class="flex-1">
                        <p class="text-gray-800 text-sm font-medium">
                          {item.quantity}x {item.name}
                        </p>
                        {#if getVariantText(item)}
                          <p class="text-gray-500 text-xs">
                            {getVariantText(item)}
                          </p>
                        {/if}
                        {#if item.addons.length > 0}
                          <p class="text-amber-600 text-xs">
                            + {item.addons.map((a) => a.name).join(", ")}
                          </p>
                        {/if}
                      </div>
                      <p class="text-gray-700 text-sm font-medium">
                        {formatRupiah(item.totalItemPrice)}
                      </p>
                    </div>
                  {/each}
                </div>

                <!-- Order Summary -->
                <div
                  class="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm"
                >
                  <div class="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatRupiah(order.subTotal)}</span>
                  </div>
                  <div class="flex justify-between text-amber-600">
                    <span>Subsidi</span>
                    <span>-{formatRupiah(order.subsidyApplied)}</span>
                  </div>
                  <div
                    class="flex justify-between font-bold text-gray-800 pt-1"
                  >
                    <span>Total Bayar</span>
                    <span>{formatRupiah(order.finalTotalToPay)}</span>
                  </div>
                </div>

                {#if isAdminMode}
                  <div
                    class="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-between sm:items-center"
                  >
                    <div
                      class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto"
                    >
                      {#if order.paymentProofUrl}
                        <button
                          onclick={() =>
                            (viewingImageUrl = order.paymentProofUrl || null)}
                          class="w-full sm:w-auto text-xs sm:text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg transition-colors flex justify-center items-center gap-1.5 font-bold shadow-sm"
                        >
                          Lihat Bukti
                        </button>
                      {/if}

                      {#if order.paymentStatus !== "approved" && order.finalTotalToPay > 0}
                        <button
                          onclick={() => approvePayment(order)}
                          class="w-full sm:w-auto text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition-all font-bold shadow-sm"
                        >
                          Approve
                        </button>
                      {/if}
                    </div>

                    <div class="flex gap-2 w-full sm:w-auto">
                      <button
                        onclick={() => startEditingOrder(order)}
                        class="flex-1 sm:flex-none text-center text-sm border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onclick={() => deleteOrder(order.id)}
                        class="flex-1 sm:flex-none text-center text-sm border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 px-4 py-2 rounded-lg transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </main>

  <!-- Edit Order Modal -->
  {#if editingOrder}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-xl max-w-md w-full p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">Edit Pesanan</h3>

        <div class="space-y-4">
          <div>
            <label
              for="edit-nama"
              class="block text-sm font-medium text-gray-700 mb-1">Nama</label
            >
            <input
              id="edit-nama"
              type="text"
              class="w-full p-2 border border-gray-300 rounded-lg"
              bind:value={editingOrder.userName}
            />
          </div>

          <div>
            <label
              for="edit-nim"
              class="block text-sm font-medium text-gray-700 mb-1">NIM</label
            >
            <input
              id="edit-nim"
              type="text"
              class="w-full p-2 border border-gray-300 rounded-lg"
              bind:value={editingOrder.userNIM}
            />
          </div>

          <div>
            <label
              for="edit-student-no"
              class="block text-sm font-medium text-gray-700 mb-1"
              >No. Urut</label
            >
            <input
              id="edit-student-no"
              type="number"
              class="w-full p-2 border border-gray-300 rounded-lg"
              bind:value={editingOrder.studentNo}
            />
          </div>

          <div>
            <label
              for="edit-subtotal"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Subtotal</label
            >
            <input
              id="edit-subtotal"
              type="number"
              class="w-full p-2 border border-gray-300 rounded-lg"
              bind:value={editingOrder.subTotal}
              onchange={() => updateFinalTotal()}
            />
          </div>

          <div>
            <label
              for="edit-subsidi"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Subsidi</label
            >
            <input
              id="edit-subsidi"
              type="number"
              class="w-full p-2 border border-gray-300 rounded-lg"
              bind:value={editingOrder.subsidyApplied}
              onchange={() => updateFinalTotal()}
            />
          </div>

          <div>
            <label
              for="edit-total"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Total Bayar</label
            >
            <input
              id="edit-total"
              type="number"
              class="w-full p-2 border border-gray-300 rounded-lg"
              bind:value={editingOrder.finalTotalToPay}
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            onclick={cancelEditing}
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onclick={saveEditedOrder}
            class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Image Viewer Modal -->
  {#if viewingImageUrl}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 cursor-zoom-out"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={() => (viewingImageUrl = null)}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="max-w-3xl w-full max-h-[90vh] flex flex-col cursor-auto"
        onclick={(e) => e.stopPropagation()}
      >
        <div class="flex justify-end mb-2">
          <button
            aria-label="Tutup gambar"
            onclick={() => (viewingImageUrl = null)}
            class="text-white bg-white/20 hover:bg-white/40 rounded-full p-2 transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path></svg
            >
          </button>
        </div>
        <img
          src={viewingImageUrl}
          alt="Bukti Pembayaran Penuh"
          class="w-full h-full object-contain rounded-xl shadow-2xl"
        />
      </div>
    </div>
  {/if}
</div>
