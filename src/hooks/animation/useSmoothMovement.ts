import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface Position {
  x: number;
  y: number;
}

interface SmoothMovementOptions {
  friction?: number; // 摩擦力 (0-1)
  springStrength?: number; // 弹簧强度 (0-1)
  maxSpeed?: number; // 最大速度
  threshold?: number; // 停止阈值
  enableInertia?: boolean; // 启用惯性
  enableBounce?: boolean; // 启用边界反弹
  bounceStrength?: number; // 反弹强度
}

interface MovementState {
  position: Position;
  velocity: Position;
  targetPosition: Position;
  isMoving: boolean;
  lastUpdateTime: number;
}

/**
 * 平滑移动动画hook
 * 提供物理感的移动动画，包括惯性、摩擦力和弹簧效果
 */
export function useSmoothMovement(
  initialPosition: Position,
  options: SmoothMovementOptions = {}
) {
  const {
    friction = 0.85,
    springStrength = 0.15,
    maxSpeed = 800,
    threshold = 0.5,
    enableInertia = true,
    enableBounce = true,
    bounceStrength = 0.6
  } = options;

  const [movementState, setMovementState] = useState<MovementState>({
    position: initialPosition,
    velocity: { x: 0, y: 0 },
    targetPosition: initialPosition,
    isMoving: false,
    lastUpdateTime: Date.now()
  });

  const animationFrameRef = useRef<number | null>(null);
  const boundariesRef = useRef<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>({
    minX: 0,
    maxX: window.innerWidth,
    minY: 0,
    maxY: window.innerHeight
  });

  // 更新边界
  const updateBoundaries = useCallback((boundaries: Partial<typeof boundariesRef.current>) => {
    boundariesRef.current = { ...boundariesRef.current, ...boundaries };
  }, []);

  // 应用边界约束和反弹
  const applyBoundaryConstraints = useCallback((pos: Position, vel: Position): { position: Position; velocity: Position } => {
    const { minX, maxX, minY, maxY } = boundariesRef.current;
    const newPos = { ...pos };
    const newVel = { ...vel };

    if (enableBounce) {
      // X轴边界反弹
      if (newPos.x < minX) {
        newPos.x = minX;
        newVel.x = Math.abs(newVel.x) * bounceStrength;
      } else if (newPos.x > maxX) {
        newPos.x = maxX;
        newVel.x = -Math.abs(newVel.x) * bounceStrength;
      }

      // Y轴边界反弹
      if (newPos.y < minY) {
        newPos.y = minY;
        newVel.y = Math.abs(newVel.y) * bounceStrength;
      } else if (newPos.y > maxY) {
        newPos.y = maxY;
        newVel.y = -Math.abs(newVel.y) * bounceStrength;
      }
    } else {
      // 简单边界约束
      newPos.x = Math.max(minX, Math.min(maxX, newPos.x));
      newPos.y = Math.max(minY, Math.min(maxY, newPos.y));
      
      if (newPos.x === minX || newPos.x === maxX) newVel.x = 0;
      if (newPos.y === minY || newPos.y === maxY) newVel.y = 0;
    }

    return { position: newPos, velocity: newVel };
  }, [enableBounce, bounceStrength]);

  // 物理更新循环
  const updatePhysics = useCallback(() => {
    setMovementState(prevState => {
      const now = Date.now();
      const deltaTime = Math.min((now - prevState.lastUpdateTime) / 1000, 1/30); // 限制最大时间步长
      
      if (deltaTime <= 0) return prevState;

      const { position, velocity, targetPosition } = prevState;

      // 计算到目标的距离和方向
      const dx = targetPosition.x - position.x;
      const dy = targetPosition.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 如果距离很小，停止移动
      if (distance < threshold && Math.abs(velocity.x) < threshold && Math.abs(velocity.y) < threshold) {
        return {
          ...prevState,
          position: targetPosition,
          velocity: { x: 0, y: 0 },
          isMoving: false,
          lastUpdateTime: now
        };
      }

      // 弹簧力
      const springForceX = dx * springStrength;
      const springForceY = dy * springStrength;

      // 更新速度
      let newVelocityX = velocity.x + springForceX * deltaTime;
      let newVelocityY = velocity.y + springForceY * deltaTime;

      // 应用摩擦力
      if (enableInertia) {
        newVelocityX *= Math.pow(friction, deltaTime * 60); // 60fps基准
        newVelocityY *= Math.pow(friction, deltaTime * 60);
      }

      // 限制最大速度
      const speed = Math.sqrt(newVelocityX * newVelocityX + newVelocityY * newVelocityY);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        newVelocityX *= scale;
        newVelocityY *= scale;
      }

      // 更新位置
      const newPositionX = position.x + newVelocityX * deltaTime;
      const newPositionY = position.y + newVelocityY * deltaTime;

      // 应用边界约束
      const constrained = applyBoundaryConstraints(
        { x: newPositionX, y: newPositionY },
        { x: newVelocityX, y: newVelocityY }
      );

      return {
        ...prevState,
        position: constrained.position,
        velocity: constrained.velocity,
        isMoving: true,
        lastUpdateTime: now
      };
    });

    animationFrameRef.current = requestAnimationFrame(updatePhysics);
  }, [springStrength, friction, maxSpeed, threshold, enableInertia, applyBoundaryConstraints]);

  // 设置目标位置
  const setTargetPosition = useCallback((newTarget: Position, immediate: boolean = false) => {
    if (immediate) {
      setMovementState(prev => {
        // 检查位置是否真的改变了，避免不必要的状态更新
        const positionChanged =
          Math.abs(newTarget.x - prev.position.x) > 0.1 ||
          Math.abs(newTarget.y - prev.position.y) > 0.1;

        if (!positionChanged && !prev.isMoving) {
          return prev; // 位置没有改变且没有在移动，不更新状态
        }

        return {
          ...prev,
          position: newTarget,
          targetPosition: newTarget,
          velocity: { x: 0, y: 0 },
          isMoving: false
        };
      });
    } else {
      setMovementState(prev => {
        // 检查目标位置是否真的改变了
        const targetChanged =
          Math.abs(newTarget.x - prev.targetPosition.x) > 0.1 ||
          Math.abs(newTarget.y - prev.targetPosition.y) > 0.1;

        if (!targetChanged) {
          return prev; // 目标位置没有改变，不更新状态
        }

        return {
          ...prev,
          targetPosition: newTarget,
          isMoving: true,
          lastUpdateTime: Date.now()
        };
      });

      // 开始动画循环
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(updatePhysics);
      }
    }
  }, [updatePhysics]);

  // 添加冲量（瞬间速度变化）
  const addImpulse = useCallback((impulse: Position) => {
    setMovementState(prev => ({
      ...prev,
      velocity: {
        x: prev.velocity.x + impulse.x,
        y: prev.velocity.y + impulse.y
      },
      isMoving: true,
      lastUpdateTime: Date.now()
    }));
    
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    }
  }, [updatePhysics]);

  // 停止移动
  const stopMovement = useCallback(() => {
    setMovementState(prev => ({
      ...prev,
      velocity: { x: 0, y: 0 },
      targetPosition: prev.position,
      isMoving: false
    }));
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // 获取当前运动信息
  const getMovementInfo = useCallback(() => {
    const speed = Math.sqrt(
      movementState.velocity.x * movementState.velocity.x + 
      movementState.velocity.y * movementState.velocity.y
    );
    
    const distanceToTarget = Math.sqrt(
      Math.pow(movementState.targetPosition.x - movementState.position.x, 2) +
      Math.pow(movementState.targetPosition.y - movementState.position.y, 2)
    );

    return {
      speed,
      distanceToTarget,
      direction: {
        x: movementState.velocity.x > 0 ? 1 : movementState.velocity.x < 0 ? -1 : 0,
        y: movementState.velocity.y > 0 ? 1 : movementState.velocity.y < 0 ? -1 : 0
      }
    };
  }, [movementState]);

  // 清理动画
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // 当移动停止时清理动画帧
  useEffect(() => {
    if (!movementState.isMoving && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [movementState.isMoving]);

  // 使用useMemo确保返回对象引用稳定，避免不必要的重新渲染
  return useMemo(() => ({
    position: movementState.position,
    velocity: movementState.velocity,
    isMoving: movementState.isMoving,
    setTargetPosition,
    addImpulse,
    stopMovement,
    updateBoundaries,
    getMovementInfo
  }), [
    movementState.position,
    movementState.velocity,
    movementState.isMoving,
    setTargetPosition,
    addImpulse,
    stopMovement,
    updateBoundaries,
    getMovementInfo
  ]);
}
