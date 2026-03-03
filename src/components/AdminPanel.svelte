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
    note?: string;
    createdAt: string;
  }

  interface ItemStats {
    name: string;
    quantity: number;
    totalRevenue: number;
  }

  interface Student {
    id?: number;
    no: number;
    nama: string;
    nim: string;
    created_at?: string;
  }

  let orders = $state<Order[]>([]);
  let students = $state<Student[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let activeTab = $state<"orders" | "stats" | "students">("orders");
  let viewingImageUrl = $state<string | null | undefined>(null);
  let isAdminMode = $state(true);
  let editingOrder = $state<Order | null>(null);
  let editingStudent = $state<(Student & { originalNim?: string }) | null>(
    null,
  );
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
    await Promise.all([fetchOrders(true), fetchSubsidy(), fetchStudents()]);
  });

  async function fetchSubsidy() {
    try {
      const response = await fetch("/api/settings", {
        credentials: "include",
      });
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
        credentials: "include",
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
      const response = await fetch(url, {
        credentials: "include",
      });
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

  async function fetchStudents() {
    try {
      const response = await fetch("/api/students", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        students = data.students || [];
      }
    } catch (e) {
      console.error("Failed to fetch students:", e);
    }
  }

  async function handleImportExcel(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        loading = true;
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Assume first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json<any>(worksheet);

        // Map to our Student format
        const importedStudents: Student[] = rawData
          .map((row: any, index: number) => {
            return {
              no: Number(row["No"] || row["No."] || row["no"] || index + 1),
              nama: String(row["Nama"] || row["nama"] || ""),
              nim: String(row["NIM"] || row["nim"] || ""),
            };
          })
          .filter((s) => s.nama && s.nim); // filter out empty rows

        if (importedStudents.length === 0) {
          throw new Error("Tidak menemukan data yang valid di file Excel.");
        }

        if (
          !confirm(
            `Ditemukan ${importedStudents.length} mahasiswa dalam file. Apakah Anda yakin ingin mengimpor data ini? Data yang lama akan digantikan.`,
          )
        ) {
          loading = false;
          input.value = ""; // clear input
          return;
        }

        const response = await fetch("/api/students/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ students: importedStudents }),
        });

        if (!response.ok) {
          const resError = await response.json();
          throw new Error(resError.error || "Gagal mengimpor data");
        }

        alert(`Berhasil mengimpor ${importedStudents.length} mahasiswa.`);
        await fetchStudents(); // Refresh list
      } catch (err: any) {
        alert("Gagal mengimpor file: " + err.message);
      } finally {
        loading = false;
        input.value = ""; // clear input
      }
    };

    reader.readAsArrayBuffer(file);
  }

  async function deleteOrder(orderId: number) {
    if (!confirm("Apakah Anda yakin ingin menghapus pesanan ini?")) return;

    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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

  function startEditingStudent(student: Student) {
    editingStudent = { ...student, originalNim: student.nim };
  }

  function cancelEditingStudent() {
    editingStudent = null;
  }

  async function saveEditedStudent() {
    if (!editingStudent) return;

    try {
      const response = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editingStudent),
      });

      if (!response.ok) {
        if (response.status === 401) {
          error = "Sesi admin telah habis. Silakan login kembali.";
          window.location.href = "/admin/login";
          return;
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update student");
      }

      // Update the student in the list locally
      const index = students.findIndex(
        (s) => s.nim === editingStudent!.originalNim,
      );
      if (index !== -1) {
        students[index] = {
          no: editingStudent.no,
          nama: editingStudent.nama,
          nim: editingStudent.nim,
        };
      }

      editingStudent = null;
      alert("Data mahasiswa berhasil diperbarui");
    } catch (e) {
      alert(
        "Gagal memperbarui mahasiswa: " + (e instanceof Error ? e.message : e),
      );
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
        credentials: "include",
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
        Catatan: order.note || "-",
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
      {#if isAdminMode}
        <button
          onclick={() => (activeTab = "students")}
          class="px-4 py-2 rounded-lg font-medium transition-colors {activeTab ===
          'students'
            ? 'bg-emerald-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'}"
        >
          Daftar Mahasiswa
        </button>
      {/if}
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
    {#if activeTab === "orders"}
      <div class="space-y-4">
        {#if loading}
          <div
            class="p-8 text-center bg-white rounded-xl shadow-sm text-gray-500"
          >
            <span class="animate-spin inline-block mr-2">&#8635;</span> Memuat data
            pesanan...
          </div>
        {:else if orders.length === 0}
          <div
            class="p-8 text-center bg-white rounded-xl shadow-sm border border-dashed border-gray-200"
          >
            <p class="text-gray-500">Belum ada pesanan yang masuk.</p>
          </div>
        {:else}
          {#each orders as order (order.id)}
            <div
              class="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row border border-gray-100"
            >
              <!-- Order Details -->
              <div
                class="p-5 flex-1 border-b md:border-b-0 md:border-r border-gray-100"
              >
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h3 class="font-bold text-lg text-gray-800">
                      {order.userName}
                    </h3>
                    <p class="text-sm text-gray-500">
                      NIM: {order.userNIM || "-"} | No: {order.studentNo || "-"}
                    </p>
                  </div>
                  <div class="text-right">
                    <span class="text-xs text-gray-400 block"
                      >{formatDate(order.createdAt)}</span
                    >
                    <span
                      class="inline-block mt-1 px-3 py-1 text-xs font-bold rounded-full {order.paymentStatus ===
                      'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'}"
                    >
                      {order.paymentStatus === "approved"
                        ? "Lunas"
                        : "Menunggu"}
                    </span>
                  </div>
                </div>

                <!-- Items list -->
                <div class="bg-gray-50 rounded-lg p-3 text-sm space-y-2 mb-3">
                  {#each order.items as item}
                    <div class="flex justify-between items-start">
                      <div>
                        <span class="font-semibold text-gray-700"
                          >{item.quantity}x {item.name}</span
                        >
                        <p class="text-xs text-gray-500 mt-1">
                          {getVariantText(item)}
                        </p>
                        {#if item.addons && item.addons.length > 0}
                          <p class="text-xs text-emerald-600 mt-0.5">
                            + {item.addons.map((a) => a.name).join(", ")}
                          </p>
                        {/if}
                      </div>
                      <span class="font-medium text-gray-700"
                        >{formatRupiah(item.totalItemPrice)}</span
                      >
                    </div>
                  {/each}
                </div>

                {#if order.note}
                  <div
                    class="bg-amber-50 rounded-lg p-3 text-sm border border-amber-100"
                  >
                    <span
                      class="font-bold text-amber-800 text-xs uppercase tracking-wider block mb-1"
                      >Catatan:</span
                    >
                    <p class="text-amber-900">{order.note}</p>
                  </div>
                {/if}
              </div>

              <!-- Payment & Actions -->
              <div class="p-5 md:w-64 bg-gray-50 flex flex-col justify-between">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-500">Subtotal</span>
                    <span class="text-gray-700"
                      >{formatRupiah(order.subTotal)}</span
                    >
                  </div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-500">Subsidi</span>
                    <span class="text-emerald-600"
                      >-{formatRupiah(order.subsidyApplied)}</span
                    >
                  </div>
                  <div
                    class="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200"
                  >
                    <span class="text-gray-800">Total</span>
                    <span class="text-emerald-700"
                      >{formatRupiah(order.finalTotalToPay)}</span
                    >
                  </div>
                </div>

                <div class="mt-4 space-y-2">
                  {#if order.paymentProofUrl}
                    <button
                      onclick={() => (viewingImageUrl = order.paymentProofUrl)}
                      class="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        ></path></svg
                      >
                      <span>Lihat Bukti Bayar</span>
                    </button>
                  {/if}

                  {#if isAdminMode}
                    {#if order.paymentStatus !== "approved"}
                      <button
                        onclick={() => approvePayment(order)}
                        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg text-sm font-bold transition-colors"
                      >
                        Verifikasi Lunas
                      </button>
                    {/if}
                    <div class="flex gap-2">
                      <button
                        onclick={() => startEditingOrder(order)}
                        class="flex-1 bg-white border border-gray-300 hover:bg-gray-50 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onclick={() => deleteOrder(order.id)}
                        class="flex-1 bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {:else if activeTab === "stats"}
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
    {:else if activeTab === "students" && isAdminMode}
      <!-- Students Management View -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden p-6">
        <div
          class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
        >
          <div>
            <h2 class="font-bold text-gray-800 text-lg">
              Daftar Mahasiswa / Undangan
            </h2>
            <p class="text-sm text-gray-500">
              Total: {students.length} orang terdaftar
            </p>
          </div>

          <div class="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <label
              class="relative cursor-pointer w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-medium"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                ></path></svg
              >
              <span>Import Excel</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                class="hidden"
                onchange={handleImportExcel}
                disabled={loading}
              />
            </label>
          </div>
        </div>

        {#if students.length === 0}
          <div
            class="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200"
          >
            <p class="text-gray-500 mb-2">Belum ada data mahasiswa.</p>
            <p class="text-sm text-gray-400">
              Gunakan tombol Import Excel di atas untuk mengunggah file data.
              Pastikan file Excel memiliki kolom yang dinamakan <b>No</b>,
              <b>Nama</b>, dan <b>NIM</b>.
            </p>
          </div>
        {:else}
          <div class="overflow-x-auto rounded-lg border border-gray-200">
            <table class="w-full text-left border-collapse">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="p-4 rounded-tl-lg font-bold text-gray-700 text-sm whitespace-nowrap"
                    >No</th
                  >
                  <th class="p-4 font-bold text-gray-700 text-sm min-w-[200px]"
                    >Nama Lengkap</th
                  >
                  <th
                    class="p-4 rounded-tr-lg font-bold text-gray-700 text-sm whitespace-nowrap"
                    >NIM</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each students as student (student.nim)}
                  <tr
                    class="border-b border-gray-100 hover:bg-emerald-50/30 transition-colors"
                  >
                    <td class="p-4 text-gray-600 text-sm font-mono"
                      >{student.no}</td
                    >
                    <td class="p-4 font-medium text-gray-800">{student.nama}</td
                    >
                    <td class="p-4 text-gray-600 text-sm font-mono"
                      >{student.nim}</td
                    >
                    <td class="p-4 text-right">
                      <button
                        onclick={() => startEditingStudent(student)}
                        class="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
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

  <!-- Edit Student Modal -->
  {#if editingStudent}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          Edit Data Mahasiswa
        </h3>

        <div class="space-y-4">
          <div>
            <label
              for="edit-student-no-list"
              class="block text-sm font-medium text-gray-700 mb-1"
              >No. Urut (Presensi)</label
            >
            <input
              id="edit-student-no-list"
              type="number"
              class="w-full p-2 border border-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none rounded-lg transition-all"
              bind:value={editingStudent.no}
            />
          </div>

          <div>
            <label
              for="edit-student-nama"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Nama Lengkap</label
            >
            <input
              id="edit-student-nama"
              type="text"
              class="w-full p-2 border border-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none rounded-lg transition-all"
              bind:value={editingStudent.nama}
            />
          </div>

          <div>
            <label
              for="edit-student-nim2"
              class="block text-sm font-medium text-gray-700 mb-1">NIM</label
            >
            <input
              id="edit-student-nim2"
              type="text"
              class="w-full p-2 border border-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none rounded-lg transition-all"
              bind:value={editingStudent.nim}
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            onclick={cancelEditingStudent}
            class="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onclick={saveEditedStudent}
            class="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
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
