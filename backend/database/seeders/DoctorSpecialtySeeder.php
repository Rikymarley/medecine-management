<?php

namespace Database\Seeders;

use App\Models\DoctorSpecialty;
use Illuminate\Database\Seeder;

class DoctorSpecialtySeeder extends Seeder
{
    public function run(): void
    {
        $specialties = [
            'Anesthesie-Reanimation',
            'Cardiologie',
            'Chirurgie generale',
            'Dermatologie',
            'Endocrinologie',
            'Gynecologie-Obstetrique',
            'Infectiologie',
            'Medecine generale',
            'Medecine interne',
            'Neurologie',
            'Ophtalmologie',
            'ORL',
            'Orthopedie',
            'Pediatrie',
            'Physiotherapie',
            'Psychiatrie',
            'Radiologie',
            'Urologie',
        ];

        foreach ($specialties as $index => $name) {
            DoctorSpecialty::updateOrCreate(
                ['normalized_name' => $this->normalize($name)],
                [
                    'name' => $name,
                    'status' => 'approved',
                    'is_active' => true,
                    'sort_order' => $index + 1,
                ]
            );
        }
    }

    private function normalize(string $value): string
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
        $ascii = strtolower(trim($ascii));
        return preg_replace('/[^a-z0-9]+/', ' ', $ascii) ?: $ascii;
    }
}

