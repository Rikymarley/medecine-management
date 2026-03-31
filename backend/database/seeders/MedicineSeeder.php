<?php

namespace Database\Seeders;

use App\Models\Medicine;
use Illuminate\Database\Seeder;

class MedicineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rows = [
            ['name' => 'Amoxicilline', 'generic_name' => 'Amoxicillin', 'strength' => '500mg', 'form' => 'Capsule', 'category' => 'standard'],
            ['name' => 'Paracetamol', 'generic_name' => 'Acetaminophen', 'strength' => '500mg', 'form' => 'Comprime', 'category' => 'standard'],
            ['name' => 'Omeprazole', 'generic_name' => 'Omeprazole', 'strength' => '20mg', 'form' => 'Capsule', 'category' => 'standard'],
            ['name' => 'Ibuprofene', 'generic_name' => 'Ibuprofen', 'strength' => '400mg', 'form' => 'Comprime', 'category' => 'standard'],
            ['name' => 'Azithromycine', 'generic_name' => 'Azithromycin', 'strength' => '500mg', 'form' => 'Comprime', 'category' => 'standard'],
            ['name' => 'Ceftriaxone', 'generic_name' => 'Ceftriaxone', 'strength' => '1g', 'form' => 'Injection', 'category' => 'standard'],
            ['name' => 'Metformine', 'generic_name' => 'Metformin', 'strength' => '850mg', 'form' => 'Comprime', 'category' => 'standard'],
            ['name' => 'Amlodipine', 'generic_name' => 'Amlodipine', 'strength' => '5mg', 'form' => 'Comprime', 'category' => 'standard'],
            ['name' => 'Losartan', 'generic_name' => 'Losartan', 'strength' => '50mg', 'form' => 'Comprime', 'category' => 'standard'],
            ['name' => 'Salbutamol', 'generic_name' => 'Salbutamol', 'strength' => '100mcg', 'form' => 'Inhalateur', 'category' => 'standard'],
            ['name' => 'ORS', 'generic_name' => 'Oral Rehydration Salts', 'strength' => null, 'form' => 'Sachet', 'category' => 'standard'],
            ['name' => 'Albendazole', 'generic_name' => 'Albendazole', 'strength' => '400mg', 'form' => 'Comprime', 'category' => 'standard'],
            ['name' => 'Fer + Acide folique', 'generic_name' => null, 'strength' => null, 'form' => 'Comprime', 'category' => 'complementaire'],
            ['name' => 'Vitamine C', 'generic_name' => 'Ascorbic Acid', 'strength' => '500mg', 'form' => 'Comprime', 'category' => 'complementaire'],
            ['name' => 'Vitamine D3', 'generic_name' => 'Cholecalciferol', 'strength' => '1000 IU', 'form' => 'Capsule', 'category' => 'complementaire'],
            ['name' => 'Zinc', 'generic_name' => 'Zinc Sulfate', 'strength' => '20mg', 'form' => 'Comprime', 'category' => 'complementaire'],
            ['name' => 'Probiotique', 'generic_name' => null, 'strength' => null, 'form' => 'Capsule', 'category' => 'complementaire'],
            ['name' => 'Calcium + Magnesium', 'generic_name' => null, 'strength' => null, 'form' => 'Comprime', 'category' => 'complementaire'],
            ['name' => 'SRO Adulte', 'generic_name' => null, 'strength' => null, 'form' => 'Sachet', 'category' => 'complementaire'],
            ['name' => 'Sirop multivitamine enfant', 'generic_name' => null, 'strength' => null, 'form' => 'Sirop', 'category' => 'complementaire'],
            ['name' => 'Tisane pectorale', 'generic_name' => null, 'strength' => null, 'form' => 'Sachet', 'category' => 'supplementaire'],
            ['name' => 'Gel hydroalcoolique', 'generic_name' => null, 'strength' => null, 'form' => 'Flacon', 'category' => 'supplementaire'],
            ['name' => 'Masque chirurgical', 'generic_name' => null, 'strength' => null, 'form' => 'Boite', 'category' => 'supplementaire'],
            ['name' => 'Solution saline nasale', 'generic_name' => null, 'strength' => null, 'form' => 'Spray', 'category' => 'supplementaire'],
            ['name' => 'Thermometre digital', 'generic_name' => null, 'strength' => null, 'form' => 'Unite', 'category' => 'supplementaire'],
            ['name' => 'Pansement sterile', 'generic_name' => null, 'strength' => null, 'form' => 'Boite', 'category' => 'supplementaire'],
            ['name' => 'Creme hydratante', 'generic_name' => null, 'strength' => null, 'form' => 'Tube', 'category' => 'supplementaire'],
            ['name' => 'Moustiquaire impregnee', 'generic_name' => null, 'strength' => null, 'form' => 'Unite', 'category' => 'supplementaire'],
        ];

        foreach ($rows as $row) {
            Medicine::updateOrCreate(
                [
                    'name' => $row['name'],
                    'strength' => $row['strength'],
                    'form' => $row['form'],
                ],
                [
                    'generic_name' => $row['generic_name'],
                    'category' => $row['category'],
                    'is_active' => true,
                    'notes' => null,
                ]
            );
        }
    }
}
