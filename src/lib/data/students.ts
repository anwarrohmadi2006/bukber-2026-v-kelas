export interface Student {
    no: number;
    nama: string;
    nim: string;
}

export const STUDENT_DATA: Student[] = [
    { no: 1, nama: "Haya Nur Fadhilah", nim: "247411014" },
    { no: 2, nama: "Ibrahim Irfan Fathoni", nim: "257411021" },
    { no: 3, nama: "Ahmad Ruhayani Azis", nim: "247411018" },
    { no: 4, nama: "Maysya Amelia Putri", nim: "257411037" },
    { no: 5, nama: "Luthfiya Zuhura Syifa Fuadah", nim: "247411008" },
    { no: 6, nama: "Kania Laksono", nim: "257411054" },
    { no: 7, nama: "Annisa Zahrotu Firda Asfari", nim: "247411003" },
    { no: 8, nama: "Khatrunnada Salsabila Zega", nim: "247411026" },
    { no: 9, nama: "Hani Nuraini", nim: "257411032" },
    { no: 10, nama: "Apriliana Putri Maulikha", nim: "257411046" },
    { no: 11, nama: "Pintasari Ayunityas", nim: "257411029" },
    { no: 12, nama: "Atlantis Cartenzian Arkadya", nim: "247411004" },
    { no: 13, nama: "Sandy Fredella Elvaretta", nim: "247411022" },
    { no: 14, nama: "Nada Salma Aulia", nim: "257411048" },
    { no: 15, nama: "Syifa Mutia Rahmah", nim: "257411028" },
    { no: 16, nama: "Anjani Nurina Afiffah Tiara", nim: "257411030" },
    { no: 17, nama: "Mu'taz Nafidz Husein Asy Syarafi", nim: "257411008" },
    { no: 18, nama: "Galih Fajar Nugroho", nim: "247411017" },
    { no: 19, nama: "Melani Yusi Aryanda", nim: "247411011" },
    { no: 20, nama: "Deanova Cella Fadila", nim: "247411001" },
    { no: 21, nama: "Aufa Muhammad Fathin", nim: "257411040" },
    { no: 22, nama: "Afrizal Wahyu Perdana", nim: "257411016" },
    { no: 23, nama: "Shela Fitriana", nim: "257411002" },
    { no: 24, nama: "Anwar Rohmadi", nim: "247411027" },
    { no: 25, nama: "Anggita Puspitaningrum", nim: "247411002" },
    { no: 26, nama: "Salma Alya Sabila", nim: "247411021" },
    { no: 27, nama: "Damar Januar Jorgie Marseno", nim: "257411031" },
    { no: 28, nama: "Syifa Aulia Rahmashodiq", nim: "257411028" },
    { no: 29, nama: "Muhammad Favian Gustaf Ahnaf", nim: "257411045" }
];

export function findStudentByNIM(nim: string): Student | undefined {
    return STUDENT_DATA.find(s => s.nim === nim);
}
