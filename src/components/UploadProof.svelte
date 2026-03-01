<script lang="ts">
    import imageCompression from "browser-image-compression";

    export let orderId: number;
    export let finalTotalToPay: number;

    let isUploadingProof = false;
    let uploadProofSuccess = false;
    let errorMessage = "";

    async function handleFileUpload(event: Event) {
        errorMessage = "";
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        isUploadingProof = true;

        try {
            // Compress image before uploading
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1200,
                useWebWorker: true,
            };

            const compressedFile = await imageCompression(file, options);

            const formData = new FormData();
            formData.append("file", compressedFile);
            formData.append("orderId", orderId.toString());

            const response = await fetch("/api/upload_proof", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to upload payment proof");
            }

            uploadProofSuccess = true;

            // Reload the page to change SSR state to 'pending admin approval'
            window.location.reload();
        } catch (error) {
            console.error("Upload error:", error);
            errorMessage =
                "Gagal mengunggah bukti pembayaran. Silakan coba file lain.";
        } finally {
            isUploadingProof = false;
        }
    }
</script>

<div class="mt-6">
    <label
        for="proof"
        class="block text-sm sm:text-base font-bold text-gray-800 mb-3"
    >
        Upload Bukti Pembayaran <span class="text-red-500">*</span>
        <span class="block text-xs font-normal text-gray-500 mt-1"
            >Harap transfer tepat <strong class="text-emerald-700"
                >Rp {finalTotalToPay.toLocaleString("id-ID")}</strong
            > untuk mempercepat verifikasi.</span
        >
    </label>

    {#if errorMessage}
        <div
            class="mb-3 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200"
        >
            {errorMessage}
        </div>
    {/if}

    <div class="relative group cursor-pointer">
        <input
            id="proof"
            type="file"
            accept="image/*"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            on:change={handleFileUpload}
            disabled={isUploadingProof || uploadProofSuccess}
        />
        <div
            class="border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all duration-300
        {isUploadingProof
                ? 'border-gray-300 bg-gray-50'
                : uploadProofSuccess
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 bg-white'}"
        >
            {#if isUploadingProof}
                <div
                    class="flex flex-col items-center justify-center space-y-3"
                >
                    <div
                        class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"
                    ></div>
                    <p
                        class="text-emerald-600 font-medium text-sm md:text-base"
                    >
                        Mengompresi & Mengunggah...
                    </p>
                </div>
            {:else if uploadProofSuccess}
                <div
                    class="flex flex-col items-center justify-center space-y-2 text-emerald-600"
                >
                    <svg
                        class="w-10 h-10 md:w-12 md:h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                    </svg>
                    <p class="font-bold text-sm md:text-base">
                        Berhasil Diunggah!
                    </p>
                </div>
            {:else}
                <div class="space-y-3">
                    <div
                        class="inline-flex w-14 h-14 md:w-16 md:h-16 rounded-full bg-emerald-100 items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform"
                    >
                        <svg
                            class="w-6 h-6 md:w-8 md:h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            ></path>
                        </svg>
                    </div>
                    <div>
                        <p
                            class="text-emerald-700 font-bold text-sm md:text-base"
                        >
                            Unggah Bukti Transfer
                        </p>
                        <p
                            class="text-[10px] md:text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold"
                        >
                            Format Support: JPG, PNG, WEBP
                        </p>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
