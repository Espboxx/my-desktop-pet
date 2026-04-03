import React from 'react';
import { useSharedPetStatus } from '@/context/PetStatusContext'; // Import context hook
import { PET_TYPES } from '@/constants/petConstants'; // Import pet types constant
import { PetType } from '@/types/petTypes'; // Import PetType for casting
import PetModel from '../Pet/PetModel'; // Import PetModel component

const PetSelectionTab: React.FC = () => {
  const { currentPetTypeId, setCurrentPetTypeId } = useSharedPetStatus(); // Get state and setter from context

  // (Removed selectedPet logic based on old settings)

  return (
    <div className="settings-section">
      <h3>宠物选择</h3>
      {/* Removed live preview section */}
      <div className="selection-section-layout">
        <div className="selection-grid-container">
          <div className="selection-grid">
            {Object.values(PET_TYPES).map((pet: PetType) => ( // Iterate over PET_TYPES
              <div
                key={pet.id}
                className={`grid-item ${currentPetTypeId === pet.id ? 'selected' : ''}`} // Use currentPetTypeId for selection
                onClick={() => setCurrentPetTypeId(pet.id)} // Use setCurrentPetTypeId on click
              >
                {/* Enhanced preview using PetModel component */}
                <div className="item-preview">
                  <PetModel
                    petType={pet}
                    expression={pet.expressions.normal}
                    size={48}
                    className="pet-selection-preview"
                  />
                </div>
                <div className="item-name">{pet.name}</div>
              </div>
            ))}
            <div className="grid-item get-more">
              <div className="item-preview">+</div>
              <div className="item-name">获取更多</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetSelectionTab;