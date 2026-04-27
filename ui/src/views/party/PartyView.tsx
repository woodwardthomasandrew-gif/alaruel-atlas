import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { atlas } from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import type {
  PartyAirship,
  PartyAirshipCargoItem,
  PartyGearItem,
  PartyMember,
  PartyPet,
} from '../../types/party';
import styles from './PartyView.module.css';

type PartyTab = 'pcs' | 'airship' | 'pets';

interface MemberRow {
  id: string;
  name: string;
  player_name: string | null;
  role: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface GearRow {
  id: string;
  party_member_id: string;
  name: string;
  quantity: number;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PetRow {
  id: string;
  name: string;
  species: string;
  bonded_to: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface AirshipRow {
  id: string;
  name: string;
  ship_class: string;
  status: string;
  current_location: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface AirshipCargoRow {
  id: string;
  airship_id: string;
  name: string;
  quantity: number;
  weight: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapPartyMember(row: MemberRow): PartyMember {
  return {
    id: row.id,
    name: row.name,
    playerName: row.player_name ?? '',
    role: row.role,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGearItem(row: GearRow): PartyGearItem {
  return {
    id: row.id,
    partyMemberId: row.party_member_id,
    name: row.name,
    quantity: row.quantity,
    notes: row.notes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPet(row: PetRow): PartyPet {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    bondedTo: row.bonded_to,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAirship(row: AirshipRow): PartyAirship {
  return {
    id: row.id,
    name: row.name,
    shipClass: row.ship_class,
    status: row.status,
    currentLocation: row.current_location,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAirshipCargoItem(row: AirshipCargoRow): PartyAirshipCargoItem {
  return {
    id: row.id,
    airshipId: row.airship_id,
    name: row.name,
    quantity: row.quantity,
    weight: row.weight,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default function PartyView() {
  const campaign = useCampaignStore(s => s.campaign);
  const [activeTab, setActiveTab] = useState<PartyTab>('pcs');
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [pets, setPets] = useState<PartyPet[]>([]);
  const [gear, setGear] = useState<PartyGearItem[]>([]);
  const [airshipCargo, setAirshipCargo] = useState<PartyAirshipCargoItem[]>([]);
  const [airship, setAirship] = useState<PartyAirship | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campaign) return;

    setLoading(true);
    setError(null);

    try {
      const [memberRows, petRows, gearRows, airshipRows, airshipCargoRows] = await Promise.all([
        atlas.db.query<MemberRow>(
          'SELECT * FROM party_members WHERE campaign_id = ? ORDER BY name ASC',
          [campaign.id],
        ),
        atlas.db.query<PetRow>(
          'SELECT * FROM party_pets WHERE campaign_id = ? ORDER BY name ASC',
          [campaign.id],
        ),
        atlas.db.query<GearRow>(
          `SELECT * FROM party_member_gear
           WHERE campaign_id = ?
           ORDER BY sort_order ASC, created_at ASC, name ASC`,
          [campaign.id],
        ),
        atlas.db.query<AirshipRow>(
          'SELECT * FROM party_airships WHERE campaign_id = ? LIMIT 1',
          [campaign.id],
        ),
        atlas.db.query<AirshipCargoRow>(
          `SELECT * FROM party_airship_cargo
           WHERE campaign_id = ?
           ORDER BY sort_order ASC, created_at ASC, name ASC`,
          [campaign.id],
        ),
      ]);

      const nextMembers = memberRows.map(mapPartyMember);
      const nextPets = petRows.map(mapPet);

      setMembers(nextMembers);
      setPets(nextPets);
      setGear(gearRows.map(mapGearItem));
      setAirshipCargo(airshipCargoRows.map(mapAirshipCargoItem));
      setAirship(airshipRows[0] ? mapAirship(airshipRows[0]) : null);
      setSelectedMemberId(current =>
        current && nextMembers.some(member => member.id === current)
          ? current
          : (nextMembers[0]?.id ?? null),
      );
      setSelectedPetId(current =>
        current && nextPets.some(pet => pet.id === current)
          ? current
          : (nextPets[0]?.id ?? null),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter(member =>
      member.name.toLowerCase().includes(term) ||
      member.playerName.toLowerCase().includes(term) ||
      member.role.toLowerCase().includes(term),
    );
  }, [members, search]);

  const filteredPets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return pets;
    return pets.filter(pet =>
      pet.name.toLowerCase().includes(term) ||
      pet.species.toLowerCase().includes(term) ||
      pet.bondedTo.toLowerCase().includes(term),
    );
  }, [pets, search]);

  const selectedMember = useMemo(
    () => members.find(member => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );
  const selectedPet = useMemo(
    () => pets.find(pet => pet.id === selectedPetId) ?? null,
    [pets, selectedPetId],
  );
  const selectedMemberGear = useMemo(
    () => gear.filter(item => item.partyMemberId === selectedMemberId),
    [gear, selectedMemberId],
  );
  const selectedAirshipCargo = useMemo(
    () => airshipCargo.filter(item => item.airshipId === airship?.id),
    [airshipCargo, airship?.id],
  );

  async function createPartyMember() {
    if (!campaign) return;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    setSaving(true);
    setError(null);
    try {
      await atlas.db.run(
        `INSERT INTO party_members
           (id, campaign_id, name, player_name, role, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, campaign.id, 'New PC', '', '', '', now, now],
      );
      await load();
      setSelectedMemberId(id);
      setActiveTab('pcs');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSaving(false);
    }
  }

  async function savePartyMember(memberId: string, patch: Partial<PartyMember>) {
    const member = members.find(entry => entry.id === memberId);
    if (!member) return;

    const nextMember = { ...member, ...patch };
    const now = new Date().toISOString();

    setMembers(prev =>
      prev.map(entry => (entry.id === memberId ? { ...nextMember, updatedAt: now } : entry)),
    );

    try {
      await atlas.db.run(
        `UPDATE party_members
         SET name = ?, player_name = ?, role = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          nextMember.name.trim() || 'Unnamed PC',
          nextMember.playerName.trim() || null,
          nextMember.role,
          nextMember.notes,
          now,
          memberId,
        ],
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      await load();
    }
  }

  async function deletePartyMember(memberId: string) {
    const member = members.find(entry => entry.id === memberId);
    if (!member || !window.confirm(`Delete "${member.name}" and all of their gear?`)) return;

    try {
      await atlas.db.run('DELETE FROM party_members WHERE id = ?', [memberId]);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  }

  async function createGearItem() {
    if (!campaign || !selectedMember) return;

    const nextSortOrder =
      selectedMemberGear.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    try {
      await atlas.db.run(
        `INSERT INTO party_member_gear
           (id, party_member_id, campaign_id, name, quantity, notes, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, selectedMember.id, campaign.id, 'New item', 1, '', nextSortOrder, now, now],
      );
      await load();
    } catch (gearError) {
      setError(gearError instanceof Error ? gearError.message : String(gearError));
    }
  }

  async function saveGearItem(gearId: string, patch: Partial<PartyGearItem>) {
    const item = gear.find(entry => entry.id === gearId);
    if (!item) return;

    const nextItem = { ...item, ...patch };
    const now = new Date().toISOString();

    setGear(prev => prev.map(entry => (entry.id === gearId ? { ...nextItem, updatedAt: now } : entry)));

    try {
      await atlas.db.run(
        `UPDATE party_member_gear
         SET name = ?, quantity = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          nextItem.name.trim() || 'Unnamed item',
          Math.max(1, Number(nextItem.quantity) || 1),
          nextItem.notes,
          now,
          gearId,
        ],
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      await load();
    }
  }

  async function deleteGearItem(gearId: string) {
    try {
      await atlas.db.run('DELETE FROM party_member_gear WHERE id = ?', [gearId]);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  }

  async function ensureAirship() {
    if (!campaign) return;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    try {
      await atlas.db.run(
        `INSERT INTO party_airships
           (id, campaign_id, name, ship_class, status, current_location, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, campaign.id, 'New Airship', '', '', '', '', now, now],
      );
      await load();
      setActiveTab('airship');
    } catch (airshipError) {
      setError(airshipError instanceof Error ? airshipError.message : String(airshipError));
    }
  }

  async function saveAirship(patch: Partial<PartyAirship>) {
    if (!airship) return;

    const nextAirship = { ...airship, ...patch };
    const now = new Date().toISOString();

    setAirship({ ...nextAirship, updatedAt: now });

    try {
      await atlas.db.run(
        `UPDATE party_airships
         SET name = ?, ship_class = ?, status = ?, current_location = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          nextAirship.name.trim() || 'Unnamed airship',
          nextAirship.shipClass,
          nextAirship.status,
          nextAirship.currentLocation,
          nextAirship.notes,
          now,
          nextAirship.id,
        ],
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      await load();
    }
  }

  async function createAirshipCargoItem() {
    if (!campaign || !airship) return;

    const nextSortOrder =
      selectedAirshipCargo.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    try {
      await atlas.db.run(
        `INSERT INTO party_airship_cargo
           (id, airship_id, campaign_id, name, quantity, weight, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, airship.id, campaign.id, 'New cargo', 1, 0, nextSortOrder, now, now],
      );
      await load();
    } catch (cargoError) {
      setError(cargoError instanceof Error ? cargoError.message : String(cargoError));
    }
  }

  async function saveAirshipCargoItem(cargoId: string, patch: Partial<PartyAirshipCargoItem>) {
    const item = airshipCargo.find(entry => entry.id === cargoId);
    if (!item) return;

    const nextItem = { ...item, ...patch };
    const now = new Date().toISOString();

    setAirshipCargo(prev =>
      prev.map(entry => (entry.id === cargoId ? { ...nextItem, updatedAt: now } : entry)),
    );

    try {
      await atlas.db.run(
        `UPDATE party_airship_cargo
         SET name = ?, quantity = ?, weight = ?, updated_at = ?
         WHERE id = ?`,
        [
          nextItem.name.trim() || 'Unnamed cargo',
          Math.max(1, Number(nextItem.quantity) || 1),
          Math.max(0, Number(nextItem.weight) || 0),
          now,
          cargoId,
        ],
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      await load();
    }
  }

  async function deleteAirshipCargoItem(cargoId: string) {
    try {
      await atlas.db.run('DELETE FROM party_airship_cargo WHERE id = ?', [cargoId]);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  }

  async function createPet() {
    if (!campaign) return;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    try {
      await atlas.db.run(
        `INSERT INTO party_pets
           (id, campaign_id, name, species, bonded_to, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, campaign.id, 'New Pet', '', '', '', now, now],
      );
      await load();
      setSelectedPetId(id);
      setActiveTab('pets');
    } catch (petError) {
      setError(petError instanceof Error ? petError.message : String(petError));
    }
  }

  async function savePet(petId: string, patch: Partial<PartyPet>) {
    const pet = pets.find(entry => entry.id === petId);
    if (!pet) return;

    const nextPet = { ...pet, ...patch };
    const now = new Date().toISOString();

    setPets(prev => prev.map(entry => (entry.id === petId ? { ...nextPet, updatedAt: now } : entry)));

    try {
      await atlas.db.run(
        `UPDATE party_pets
         SET name = ?, species = ?, bonded_to = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          nextPet.name.trim() || 'Unnamed pet',
          nextPet.species,
          nextPet.bondedTo,
          nextPet.notes,
          now,
          petId,
        ],
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      await load();
    }
  }

  async function deletePet(petId: string) {
    const pet = pets.find(entry => entry.id === petId);
    if (!pet || !window.confirm(`Delete "${pet.name}"?`)) return;

    try {
      await atlas.db.run('DELETE FROM party_pets WHERE id = ?', [petId]);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Party</h2>
          <span className={styles.count}>
            {members.length} PCs · {pets.length} pets
          </span>
        </div>
        <div className={styles.toolbarRight}>
          {activeTab !== 'airship' && (
            <input
              className={styles.search}
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={activeTab === 'pcs' ? 'Search PCs...' : 'Search pets...'}
            />
          )}
          {activeTab === 'pcs' && (
            <button className={styles.primaryBtn} onClick={createPartyMember} disabled={saving}>
              <Icon name="plus" size={16} />
              New PC
            </button>
          )}
          {activeTab === 'airship' && !airship && (
            <button className={styles.primaryBtn} onClick={ensureAirship}>
              <Icon name="plus" size={16} />
              Create Airship
            </button>
          )}
          {activeTab === 'pets' && (
            <button className={styles.primaryBtn} onClick={createPet}>
              <Icon name="plus" size={16} />
              New Pet
            </button>
          )}
        </div>
      </header>

      <div className={styles.subtabs}>
        <button
          className={`${styles.subtab} ${activeTab === 'pcs' ? styles.subtabActive : ''}`}
          onClick={() => setActiveTab('pcs')}
        >
          PCs
        </button>
        <button
          className={`${styles.subtab} ${activeTab === 'airship' ? styles.subtabActive : ''}`}
          onClick={() => setActiveTab('airship')}
        >
          Airship
        </button>
        <button
          className={`${styles.subtab} ${activeTab === 'pets' ? styles.subtabActive : ''}`}
          onClick={() => setActiveTab('pets')}
        >
          Party Pets
        </button>
      </div>

      {error && (
        <div className={styles.errorBar}>
          <Icon name="alert" size={15} />
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.emptyState}>
          <Icon name="loader" size={24} className={styles.spin} />
          <p>Loading party records...</p>
        </div>
      ) : activeTab === 'pcs' ? (
        <div className={styles.body}>
          <div className={styles.listPane}>
            {filteredMembers.length === 0 ? (
              <div className={styles.emptyList}>
                <p>No player characters yet.</p>
              </div>
            ) : (
              filteredMembers.map(member => (
                <button
                  key={member.id}
                  className={`${styles.listItem} ${selectedMemberId === member.id ? styles.listItemActive : ''}`}
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  <span className={styles.listTitle}>{member.name}</span>
                  <span className={styles.listMeta}>
                    {member.playerName || 'No player'}{member.role ? ` · ${member.role}` : ''}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className={styles.detailPane}>
            {!selectedMember ? (
              <div className={styles.emptyState}>
                <Icon name="users" size={28} />
                <p>Select a PC to manage their notes and gear.</p>
              </div>
            ) : (
              <div className={styles.detailContent}>
                <div className={styles.detailHeader}>
                  <div>
                    <h3 className={styles.detailTitle}>{selectedMember.name}</h3>
                    <p className={styles.detailSubtitle}>Player character sheet and kit</p>
                  </div>
                  <button
                    className={styles.iconBtn}
                    onClick={() => deletePartyMember(selectedMember.id)}
                    title="Delete PC"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Name</span>
                    <input
                      className={styles.input}
                      value={selectedMember.name}
                      onChange={event => savePartyMember(selectedMember.id, { name: event.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Player</span>
                    <input
                      className={styles.input}
                      value={selectedMember.playerName}
                      onChange={event => savePartyMember(selectedMember.id, { playerName: event.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Role / Class</span>
                    <input
                      className={styles.input}
                      value={selectedMember.role}
                      onChange={event => savePartyMember(selectedMember.id, { role: event.target.value })}
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span>PC Notes</span>
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    value={selectedMember.notes}
                    onChange={event => savePartyMember(selectedMember.id, { notes: event.target.value })}
                  />
                </label>

                <div className={styles.sectionHeader}>
                  <div>
                    <h4 className={styles.sectionTitle}>Gear</h4>
                    <p className={styles.sectionCopy}>Each item has its own quantity and notes.</p>
                  </div>
                  <button className={styles.secondaryBtn} onClick={createGearItem}>
                    <Icon name="plus" size={15} />
                    Add Gear
                  </button>
                </div>

                {selectedMemberGear.length === 0 ? (
                  <div className={styles.emptyList}>
                    <p>No gear tracked for this PC yet.</p>
                  </div>
                ) : (
                  <div className={styles.gearList}>
                    {selectedMemberGear.map(item => (
                      <div key={item.id} className={styles.gearCard}>
                        <div className={styles.gearTopRow}>
                          <input
                            className={styles.input}
                            value={item.name}
                            onChange={event => saveGearItem(item.id, { name: event.target.value })}
                          />
                          <input
                            className={`${styles.input} ${styles.qtyInput}`}
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={event => saveGearItem(item.id, { quantity: Number(event.target.value) || 1 })}
                          />
                          <button
                            className={styles.iconBtn}
                            onClick={() => deleteGearItem(item.id)}
                            title="Delete gear item"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                        <textarea
                          className={`${styles.input} ${styles.gearNotes}`}
                          value={item.notes}
                          onChange={event => saveGearItem(item.id, { notes: event.target.value })}
                          placeholder="Item notes"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'airship' ? (
        <div className={styles.singlePane}>
          {!airship ? (
            <div className={styles.emptyState}>
              <Icon name="network" size={28} />
              <p>No airship tracked for this campaign yet.</p>
            </div>
          ) : (
            <div className={styles.detailContent}>
              <div className={styles.detailHeader}>
                <div>
                  <h3 className={styles.detailTitle}>{airship.name}</h3>
                  <p className={styles.detailSubtitle}>Campaign airship management</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Name</span>
                  <input
                    className={styles.input}
                    value={airship.name}
                    onChange={event => saveAirship({ name: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>Class / Make</span>
                  <input
                    className={styles.input}
                    value={airship.shipClass}
                    onChange={event => saveAirship({ shipClass: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>Status</span>
                  <input
                    className={styles.input}
                    value={airship.status}
                    onChange={event => saveAirship({ status: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>Current Location</span>
                  <input
                    className={styles.input}
                    value={airship.currentLocation}
                    onChange={event => saveAirship({ currentLocation: event.target.value })}
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span>Airship Notes</span>
                <textarea
                  className={`${styles.input} ${styles.textareaTall}`}
                  value={airship.notes}
                  onChange={event => saveAirship({ notes: event.target.value })}
                />
              </label>

              <div className={styles.sectionHeader}>
                <div>
                  <h4 className={styles.sectionTitle}>Cargo</h4>
                  <p className={styles.sectionCopy}>Track what is on board and how heavy it is.</p>
                </div>
                <button className={styles.secondaryBtn} onClick={createAirshipCargoItem}>
                  <Icon name="plus" size={15} />
                  Add Cargo
                </button>
              </div>

              {selectedAirshipCargo.length === 0 ? (
                <div className={styles.emptyList}>
                  <p>No cargo tracked for this airship yet.</p>
                </div>
              ) : (
                <div className={styles.gearList}>
                  {selectedAirshipCargo.map(item => (
                    <div key={item.id} className={styles.gearCard}>
                      <div className={styles.cargoTopRow}>
                        <input
                          className={styles.input}
                          value={item.name}
                          onChange={event => saveAirshipCargoItem(item.id, { name: event.target.value })}
                        />
                        <input
                          className={`${styles.input} ${styles.qtyInput}`}
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={event => saveAirshipCargoItem(item.id, { quantity: Number(event.target.value) || 1 })}
                        />
                        <input
                          className={`${styles.input} ${styles.weightInput}`}
                          type="number"
                          min={0}
                          step="0.1"
                          value={item.weight}
                          onChange={event => saveAirshipCargoItem(item.id, { weight: Number(event.target.value) || 0 })}
                        />
                        <button
                          className={styles.iconBtn}
                          onClick={() => deleteAirshipCargoItem(item.id)}
                          title="Delete cargo item"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.listPane}>
            {filteredPets.length === 0 ? (
              <div className={styles.emptyList}>
                <p>No party pets yet.</p>
              </div>
            ) : (
              filteredPets.map(pet => (
                <button
                  key={pet.id}
                  className={`${styles.listItem} ${selectedPetId === pet.id ? styles.listItemActive : ''}`}
                  onClick={() => setSelectedPetId(pet.id)}
                >
                  <span className={styles.listTitle}>{pet.name}</span>
                  <span className={styles.listMeta}>
                    {pet.species || 'No species'}{pet.bondedTo ? ` · ${pet.bondedTo}` : ''}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className={styles.detailPane}>
            {!selectedPet ? (
              <div className={styles.emptyState}>
                <Icon name="bookmark" size={28} />
                <p>Select a pet to manage details and notes.</p>
              </div>
            ) : (
              <div className={styles.detailContent}>
                <div className={styles.detailHeader}>
                  <div>
                    <h3 className={styles.detailTitle}>{selectedPet.name}</h3>
                    <p className={styles.detailSubtitle}>Companion and familiar tracking</p>
                  </div>
                  <button
                    className={styles.iconBtn}
                    onClick={() => deletePet(selectedPet.id)}
                    title="Delete pet"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Name</span>
                    <input
                      className={styles.input}
                      value={selectedPet.name}
                      onChange={event => savePet(selectedPet.id, { name: event.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Species</span>
                    <input
                      className={styles.input}
                      value={selectedPet.species}
                      onChange={event => savePet(selectedPet.id, { species: event.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Bonded To</span>
                    <input
                      className={styles.input}
                      value={selectedPet.bondedTo}
                      onChange={event => savePet(selectedPet.id, { bondedTo: event.target.value })}
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span>Pet Notes</span>
                  <textarea
                    className={`${styles.input} ${styles.textareaTall}`}
                    value={selectedPet.notes}
                    onChange={event => savePet(selectedPet.id, { notes: event.target.value })}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
