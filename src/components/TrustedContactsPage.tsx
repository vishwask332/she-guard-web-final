import React, { useState } from "react";
import { Edit2, MessageSquare, Phone, Plus, Trash2, Users } from "lucide-react";
import { buildSmsHref, buildTelHref, generateSafeId } from "../lib/safetyUtils";
import { deleteTrustedContact, saveTrustedContact } from "../services/firestoreService";
import type { TrustedContact, UserProfile } from "../types/sheguard";

interface TrustedContactsPageProps {
  userId: string;
  profile: UserProfile | null;
  contacts: TrustedContact[];
  isOnline: boolean;
}

export function TrustedContactsPage({
  userId,
  profile,
  contacts,
  isOnline,
}: TrustedContactsPageProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [priority, setPriority] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openAddForm = () => {
    setEditingId(null);
    setName("");
    setPhone("");
    setRelationship("");
    setPriority(Math.min(10, contacts.length + 1));
    setErrorMsg(null);
    setShowForm(true);
  };

  const openEditForm = (contact: TrustedContact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setPhone(contact.phone);
    setRelationship(contact.relationship);
    setPriority(contact.priority);
    setErrorMsg(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || phone.trim().length < 3) {
      setErrorMsg("Please enter a valid contact name and phone number.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const id = editingId || generateSafeId("contact");
      await saveTrustedContact(
        userId,
        {
          id,
          name: name.trim(),
          phone: phone.trim(),
          relationship: relationship.trim() || "Trusted Contact",
          priority,
        },
        Boolean(editingId)
      );
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not save contact. Please check connectivity."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    try {
      await deleteTrustedContact(userId, contactId);
      setConfirmDeleteId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not delete contact.");
    }
  };

  const defaultSmsBody =
    profile?.emergencyMessage ||
    "Hi, I'm reaching out from SHE-GUARD. Please stay reachable in case I need help.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1E122B]">Trusted Emergency Contacts</h2>
          <p className="text-sm text-[#5B4B6B] mt-1">
            Add family members or friends you can message or call in one tap during an emergency.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          disabled={!isOnline}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Trusted Contact</span>
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#B91C1C]"
        >
          {errorMsg}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#DDD6FE] rounded-3xl p-6 space-y-4"
        >
          <h3 className="text-lg font-bold text-[#1E122B]">
            {editingId ? "Edit Trusted Contact" : "New Trusted Contact"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-[#1E122B] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Meera Krishnan"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              />
            </div>

            <div>
              <label
                htmlFor="contact-phone"
                className="block text-sm font-medium text-[#1E122B] mb-1.5"
              >
                Phone Number
              </label>
              <input
                id="contact-phone"
                type="tel"
                required
                minLength={3}
                maxLength={32}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +91 98765 43210"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              />
            </div>

            <div>
              <label
                htmlFor="contact-rel"
                className="block text-sm font-medium text-[#1E122B] mb-1.5"
              >
                Relationship
              </label>
              <input
                id="contact-rel"
                type="text"
                maxLength={60}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g., Mother, Sister, Roommate"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              />
            </div>

            <div>
              <label
                htmlFor="contact-priority"
                className="block text-sm font-medium text-[#1E122B] mb-1.5"
              >
                Priority Order (1 = First)
              </label>
              <input
                id="contact-priority"
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#FDFBFE] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-[#EAE2F0] bg-white hover:bg-[#F8F4FC] text-sm font-medium text-[#4A3B5C] cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Contact"}
            </button>
          </div>
        </form>
      )}

      {/* Contacts List */}
      <div className="bg-white border border-[#EAE2F0] rounded-3xl overflow-hidden">
        {contacts.length > 0 ? (
          <div className="divide-y divide-[#EAE2F0]">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-[#1E122B]">{contact.name}</h3>
                    <span className="text-xs text-[#6B5B7B]">·</span>
                    <span className="text-xs font-medium text-[#5B21B6]">
                      Priority {contact.priority}
                    </span>
                  </div>
                  <p className="text-sm text-[#5B4B6B] font-mono tabular-nums">
                    {contact.relationship || "Trusted Contact"} · {contact.phone}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={buildSmsHref(contact.phone, defaultSmsBody)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#FDF2F7] hover:bg-[#FCE7F3] border border-[#FBCFE8] text-xs font-semibold text-[#9D174D] inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message (SMS)</span>
                  </a>
                  <a
                    href={buildTelHref(contact.phone)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => openEditForm(contact)}
                    aria-label={`Edit ${contact.name}`}
                    className="min-h-[42px] min-w-[42px] px-3 py-2 rounded-xl border border-[#EAE2F0] hover:bg-[#F8F4FC] text-[#4A3B5C] inline-flex items-center justify-center cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {confirmDeleteId === contact.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(contact.id)}
                        className="min-h-[42px] px-3 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        Confirm Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[42px] px-3 py-2 rounded-xl border border-[#EAE2F0] text-xs font-medium text-[#5B4B6B] cursor-pointer whitespace-nowrap"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(contact.id)}
                      aria-label={`Remove ${contact.name}`}
                      className="min-h-[42px] min-w-[42px] px-3 py-2 rounded-xl border border-[#EAE2F0] hover:bg-[#FEF2F2] hover:text-[#DC2626] text-[#5B4B6B] inline-flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F8F4FC] text-[#6D28D9] flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1E122B]">No trusted contacts added yet</h3>
            <p className="text-sm text-[#5B4B6B] max-w-md mx-auto">
              Add at least one trusted friend or family member so you can send SMS alerts or call
              them with one tap from the SOS screen or Journey Monitor.
            </p>
            <button
              type="button"
              onClick={openAddForm}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold cursor-pointer"
            >
              Add Your First Contact
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
