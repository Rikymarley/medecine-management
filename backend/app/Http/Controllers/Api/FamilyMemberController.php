<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use Illuminate\Http\Request;

class FamilyMemberController extends Controller
{
    public function index(Request $request)
    {
        $members = FamilyMember::query()
            ->where('patient_user_id', $request->user()->id)
            ->orderBy('name')
            ->get();

        return response()->json($members);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'age' => ['nullable', 'integer', 'min:0', 'max:130'],
            'gender' => ['nullable', 'in:male,female,other'],
            'relationship' => ['nullable', 'in:parent,spouse,child,sibling,grandparent,other'],
        ]);

        $member = FamilyMember::create([
            ...$data,
            'patient_user_id' => $request->user()->id,
        ]);

        return response()->json($member, 201);
    }

    public function update(Request $request, FamilyMember $familyMember)
    {
        if ($familyMember->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'age' => ['nullable', 'integer', 'min:0', 'max:130'],
            'gender' => ['nullable', 'in:male,female,other'],
            'relationship' => ['nullable', 'in:parent,spouse,child,sibling,grandparent,other'],
        ]);

        $familyMember->update($data);

        return response()->json($familyMember->fresh());
    }

    public function destroy(Request $request, FamilyMember $familyMember)
    {
        if ($familyMember->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $familyMember->delete();

        return response()->json(['message' => 'Membre supprime.']);
    }
}
